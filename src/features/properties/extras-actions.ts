"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { requireOrganizationContext } from "@/server/organization-context";
import type { Enums } from "@/types/database";

import { canEditProperty } from "./access";
import type { ActionResult } from "./schema";

function editPath(propertyId: string): string {
  return `/dashboard/properties/${propertyId}`;
}

// ---- Document upload (Supabase Storage) -------------------------

const DOCUMENT_BUCKET = "property-media";
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;
const ALLOWED_DOCUMENT_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

/**
 * Загружает файл документа объекта в Supabase Storage и создаёт запись
 * property_documents. Файл кладётся сервис-клиентом (как и медиа), строка —
 * anon-клиентом под RLS. Зеркалит uploadPropertyMedia.
 */
export async function uploadPropertyDocument(
  formData: FormData,
): Promise<ActionResult> {
  const context = await requireOrganizationContext();
  if (!context.organization) return { ok: false, error: "No organization." };

  const propertyId = formData.get("propertyId");
  const file = formData.get("file");
  const nameValue = formData.get("name");
  const typeValue = formData.get("type");
  if (typeof propertyId !== "string" || !(file instanceof File)) {
    return { ok: false, error: "Invalid upload." };
  }
  const type: Enums<"document_type"> =
    typeValue === "other" ? "other" : "brochure";
  const name =
    typeof nameValue === "string" && nameValue.trim()
      ? nameValue.trim()
      : file.name;

  if (file.size === 0 || file.size > MAX_DOCUMENT_SIZE) {
    return { ok: false, error: "File must be between 1 byte and 10MB." };
  }
  if (!ALLOWED_DOCUMENT_MIME.has(file.type)) {
    return {
      ok: false,
      error: "Only PDF, image or Word documents are allowed.",
    };
  }

  const supabase = createClient();
  const { data: property } = await supabase
    .from("properties")
    .select("id, assigned_agent_id, co_agent_ids")
    .eq("organization_id", context.organization.id)
    .eq("id", propertyId)
    .maybeSingle();
  if (!property || !canEditProperty(context, property)) {
    return { ok: false, error: "You cannot edit this property." };
  }

  const extension =
    file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ||
    "pdf";
  const storagePath = `${context.organization.id}/${propertyId}/documents/${crypto.randomUUID()}.${extension}`;

  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage
    .from(DOCUMENT_BUCKET)
    .upload(storagePath, await file.arrayBuffer(), {
      contentType: file.type,
      upsert: false,
    });
  if (uploadError) {
    return { ok: false, error: "Could not upload the file." };
  }

  const { data: publicUrl } = admin.storage
    .from(DOCUMENT_BUCKET)
    .getPublicUrl(storagePath);

  const { count } = await supabase
    .from("property_documents")
    .select("*", { count: "exact", head: true })
    .eq("property_id", propertyId);

  const { error: insertError } = await supabase
    .from("property_documents")
    .insert({
      organization_id: context.organization.id,
      property_id: propertyId,
      name,
      url: publicUrl.publicUrl,
      storage_path: storagePath,
      type,
      sort_order: count ?? 0,
    });
  if (insertError) {
    // Запись не создалась — убираем осиротевший файл из Storage.
    await admin.storage.from(DOCUMENT_BUCKET).remove([storagePath]);
    return { ok: false, error: "Could not save the document." };
  }

  revalidatePath(editPath(propertyId));
  return { ok: true };
}

// ---- Videos -----------------------------------------------------

const videoSchema = z.object({
  propertyId: z.uuid(),
  url: z.url(),
  title: z.string().trim().max(200).nullable(),
  type: z.enum([
    "tour",
    "realtor_review",
    "virtual_tour",
  ] as const satisfies readonly Enums<"video_type">[]),
});
export type AddVideoInput = z.infer<typeof videoSchema>;

export async function addPropertyVideo(input: AddVideoInput): Promise<ActionResult> {
  const parsed = videoSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid video." };
  const context = await requireOrganizationContext();
  if (!context.organization) return { ok: false, error: "No organization." };
  const supabase = createClient();
  const { data: property } = await supabase
    .from("properties")
    .select("id, assigned_agent_id, co_agent_ids")
    .eq("organization_id", context.organization.id)
    .eq("id", parsed.data.propertyId)
    .maybeSingle();
  if (!property || !canEditProperty(context, property)) {
    return { ok: false, error: "You cannot edit this property." };
  }
  const { count } = await supabase
    .from("property_videos")
    .select("*", { count: "exact", head: true })
    .eq("property_id", parsed.data.propertyId);
  const { error } = await supabase.from("property_videos").insert({
    organization_id: context.organization.id,
    property_id: parsed.data.propertyId,
    url: parsed.data.url,
    title: parsed.data.title,
    type: parsed.data.type,
    sort_order: count ?? 0,
  });
  if (error) return { ok: false, error: "Could not add video." };
  revalidatePath(editPath(parsed.data.propertyId));
  return { ok: true };
}

export async function deletePropertyVideo(id: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Invalid id." };
  const context = await requireOrganizationContext();
  if (!context.organization) return { ok: false, error: "No organization." };
  const supabase = createClient();
  const { data: video } = await supabase
    .from("property_videos")
    .select("id, property_id")
    .eq("organization_id", context.organization.id)
    .eq("id", id)
    .maybeSingle();
  if (!video) return { ok: false, error: "Video not found." };
  const { error } = await supabase.from("property_videos").delete().eq("id", id);
  if (error) return { ok: false, error: "Could not delete video." };
  revalidatePath(editPath(video.property_id));
  return { ok: true };
}

// ---- Documents --------------------------------------------------

const documentSchema = z.object({
  propertyId: z.uuid(),
  name: z.string().trim().min(1).max(200),
  url: z.url(),
  type: z.enum([
    "brochure",
    "other",
  ] as const satisfies readonly Enums<"document_type">[]),
});
export type AddDocumentInput = z.infer<typeof documentSchema>;

export async function addPropertyDocument(
  input: AddDocumentInput,
): Promise<ActionResult> {
  const parsed = documentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid document." };
  const context = await requireOrganizationContext();
  if (!context.organization) return { ok: false, error: "No organization." };
  const supabase = createClient();
  const { data: property } = await supabase
    .from("properties")
    .select("id, assigned_agent_id, co_agent_ids")
    .eq("organization_id", context.organization.id)
    .eq("id", parsed.data.propertyId)
    .maybeSingle();
  if (!property || !canEditProperty(context, property)) {
    return { ok: false, error: "You cannot edit this property." };
  }
  const { count } = await supabase
    .from("property_documents")
    .select("*", { count: "exact", head: true })
    .eq("property_id", parsed.data.propertyId);
  const { error } = await supabase.from("property_documents").insert({
    organization_id: context.organization.id,
    property_id: parsed.data.propertyId,
    name: parsed.data.name,
    url: parsed.data.url,
    type: parsed.data.type,
    sort_order: count ?? 0,
  });
  if (error) return { ok: false, error: "Could not add document." };
  revalidatePath(editPath(parsed.data.propertyId));
  return { ok: true };
}

export async function deletePropertyDocument(id: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Invalid id." };
  const context = await requireOrganizationContext();
  if (!context.organization) return { ok: false, error: "No organization." };
  const supabase = createClient();
  const { data: doc } = await supabase
    .from("property_documents")
    .select("id, property_id, storage_path")
    .eq("organization_id", context.organization.id)
    .eq("id", id)
    .maybeSingle();
  if (!doc) return { ok: false, error: "Document not found." };
  const { error } = await supabase
    .from("property_documents")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: "Could not delete document." };
  // Загруженный файл (если был) убираем из Storage.
  if (doc.storage_path) {
    const admin = createAdminClient();
    await admin.storage.from(DOCUMENT_BUCKET).remove([doc.storage_path]);
  }
  revalidatePath(editPath(doc.property_id));
  return { ok: true };
}

// ---- Nearby places ----------------------------------------------

const nearbyPlaceSchema = z.object({
  propertyId: z.uuid(),
  name: z.string().trim().min(1).max(200),
  category: z.string().trim().max(100).nullable(),
  distance: z.coerce.number().min(0).nullable(),
  distanceUnit: z.string().trim().max(20).nullable(),
});
export type AddNearbyPlaceInput = z.infer<typeof nearbyPlaceSchema>;

export async function addNearbyPlace(
  input: AddNearbyPlaceInput,
): Promise<ActionResult> {
  const parsed = nearbyPlaceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid place." };
  const context = await requireOrganizationContext();
  if (!context.organization) return { ok: false, error: "No organization." };
  const supabase = createClient();
  const { data: property } = await supabase
    .from("properties")
    .select("id, assigned_agent_id, co_agent_ids")
    .eq("organization_id", context.organization.id)
    .eq("id", parsed.data.propertyId)
    .maybeSingle();
  if (!property || !canEditProperty(context, property)) {
    return { ok: false, error: "You cannot edit this property." };
  }
  const { count } = await supabase
    .from("nearby_places")
    .select("*", { count: "exact", head: true })
    .eq("property_id", parsed.data.propertyId);
  const { error } = await supabase.from("nearby_places").insert({
    organization_id: context.organization.id,
    property_id: parsed.data.propertyId,
    name: parsed.data.name,
    category: parsed.data.category,
    distance: parsed.data.distance,
    distance_unit: parsed.data.distanceUnit,
    sort_order: count ?? 0,
  });
  if (error) return { ok: false, error: "Could not add place." };
  revalidatePath(editPath(parsed.data.propertyId));
  return { ok: true };
}

export async function deleteNearbyPlace(id: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Invalid id." };
  const context = await requireOrganizationContext();
  if (!context.organization) return { ok: false, error: "No organization." };
  const supabase = createClient();
  const { data: place } = await supabase
    .from("nearby_places")
    .select("id, property_id")
    .eq("organization_id", context.organization.id)
    .eq("id", id)
    .maybeSingle();
  if (!place) return { ok: false, error: "Place not found." };
  const { error } = await supabase.from("nearby_places").delete().eq("id", id);
  if (error) return { ok: false, error: "Could not delete place." };
  revalidatePath(editPath(place.property_id));
  return { ok: true };
}
