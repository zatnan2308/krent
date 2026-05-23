"use server";

import { revalidatePath } from "next/cache";

import { dispatchWebhookEvent } from "@/features/agency-api/webhooks";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { requireOrganizationContext } from "@/server/organization-context";

import { canEditProperty } from "./access";
import type { ActionResult } from "./schema";

const BUCKET = "property-media";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

function editPath(propertyId: string): string {
  return `/dashboard/properties/${propertyId}`;
}

/**
 * Загружает изображение объекта в Supabase Storage и создаёт запись media.
 * Сам файл кладётся сервисным клиентом (на bucket нет storage-политик),
 * а строка property_media пишется anon-клиентом — её защищает RLS.
 */
export async function uploadPropertyMedia(
  formData: FormData,
): Promise<ActionResult> {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false, error: "No active organization." };
  }

  const propertyId = formData.get("propertyId");
  const file = formData.get("file");
  const categoryValue = formData.get("category");
  if (typeof propertyId !== "string" || !(file instanceof File)) {
    return { ok: false, error: "Invalid upload." };
  }
  const category =
    categoryValue === "cover" || categoryValue === "floor_plan"
      ? categoryValue
      : "gallery";

  if (file.size === 0 || file.size > MAX_FILE_SIZE) {
    return { ok: false, error: "File must be between 1 byte and 10MB." };
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return {
      ok: false,
      error: "Only JPG, PNG, WebP or AVIF images are allowed.",
    };
  }

  const supabase = createClient();
  const { data: property } = await supabase
    .from("properties")
    .select("id, assigned_agent_id, co_agent_ids")
    .eq("organization_id", context.organization.id)
    .eq("id", propertyId)
    .maybeSingle();
  if (!property) {
    return { ok: false, error: "Property not found." };
  }
  if (!canEditProperty(context, property)) {
    return { ok: false, error: "You cannot edit this property." };
  }

  const extension =
    file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ||
    "jpg";
  const storagePath = `${context.organization.id}/${propertyId}/${crypto.randomUUID()}.${extension}`;

  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, await file.arrayBuffer(), {
      contentType: file.type,
      upsert: false,
    });
  if (uploadError) {
    return { ok: false, error: "Could not upload the file." };
  }

  const { data: publicUrl } = admin.storage
    .from(BUCKET)
    .getPublicUrl(storagePath);

  const { count } = await supabase
    .from("property_media")
    .select("*", { count: "exact", head: true })
    .eq("property_id", propertyId);

  const { error: insertError } = await supabase.from("property_media").insert({
    property_id: propertyId,
    organization_id: context.organization.id,
    url: publicUrl.publicUrl,
    storage_path: storagePath,
    category,
    sort_order: count ?? 0,
  });
  if (insertError) {
    // Запись не создалась — убираем осиротевший файл из Storage.
    await admin.storage.from(BUCKET).remove([storagePath]);
    return { ok: false, error: "Could not save the media record." };
  }

  await dispatchWebhookEvent({
    organizationId: context.organization.id,
    eventType: "property.media_updated",
    entityType: "property",
    entityId: propertyId,
    payload: { property_id: propertyId, category },
  });

  revalidatePath(editPath(propertyId));
  return { ok: true };
}

/** Удаляет изображение объекта: строку media и файл в Storage. */
export async function deletePropertyMedia(
  mediaId: string,
): Promise<ActionResult> {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false, error: "No active organization." };
  }

  const supabase = createClient();
  const { data: media } = await supabase
    .from("property_media")
    .select("id, property_id, storage_path")
    .eq("organization_id", context.organization.id)
    .eq("id", mediaId)
    .maybeSingle();
  if (!media) {
    return { ok: false, error: "Media not found." };
  }

  const { data: property } = await supabase
    .from("properties")
    .select("id, assigned_agent_id, co_agent_ids")
    .eq("organization_id", context.organization.id)
    .eq("id", media.property_id)
    .maybeSingle();
  if (!property || !canEditProperty(context, property)) {
    return { ok: false, error: "You cannot edit this property." };
  }

  const { error } = await supabase
    .from("property_media")
    .delete()
    .eq("id", mediaId);
  if (error) {
    return { ok: false, error: "Could not delete the media." };
  }

  if (media.storage_path) {
    const admin = createAdminClient();
    await admin.storage.from(BUCKET).remove([media.storage_path]);
  }

  await dispatchWebhookEvent({
    organizationId: context.organization.id,
    eventType: "property.media_updated",
    entityType: "property",
    entityId: media.property_id,
    payload: { property_id: media.property_id, removed_media_id: mediaId },
  });

  revalidatePath(editPath(media.property_id));
  return { ok: true };
}

/** Делает изображение обложкой объекта (category = cover). */
export async function setPropertyMediaCover(
  mediaId: string,
): Promise<ActionResult> {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false, error: "No active organization." };
  }

  const supabase = createClient();
  const { data: media } = await supabase
    .from("property_media")
    .select("id, property_id")
    .eq("organization_id", context.organization.id)
    .eq("id", mediaId)
    .maybeSingle();
  if (!media) {
    return { ok: false, error: "Media not found." };
  }

  const { data: property } = await supabase
    .from("properties")
    .select("id, assigned_agent_id, co_agent_ids")
    .eq("organization_id", context.organization.id)
    .eq("id", media.property_id)
    .maybeSingle();
  if (!property || !canEditProperty(context, property)) {
    return { ok: false, error: "You cannot edit this property." };
  }

  // Снимаем обложку с остальных изображений объекта.
  await supabase
    .from("property_media")
    .update({ category: "gallery" })
    .eq("property_id", media.property_id)
    .eq("category", "cover");
  const { error } = await supabase
    .from("property_media")
    .update({ category: "cover" })
    .eq("id", mediaId);
  if (error) {
    return { ok: false, error: "Could not update the cover image." };
  }

  revalidatePath(editPath(media.property_id));
  return { ok: true };
}

/** Обновляет alt-текст. */
export async function updatePropertyMediaAlt(
  mediaId: string,
  alt: string,
): Promise<ActionResult> {
  const context = await requireOrganizationContext();
  if (!context.organization) return { ok: false, error: "No organization." };
  const supabase = createClient();
  const { data: media } = await supabase
    .from("property_media")
    .select("id, property_id")
    .eq("organization_id", context.organization.id)
    .eq("id", mediaId)
    .maybeSingle();
  if (!media) return { ok: false, error: "Media not found." };
  const { error } = await supabase
    .from("property_media")
    .update({ alt: alt.trim() || null })
    .eq("id", mediaId);
  if (error) return { ok: false, error: "Could not update alt text." };
  revalidatePath(editPath(media.property_id));
  return { ok: true };
}

/** Двигает media вверх/вниз по sort_order через swap с соседом. */
export async function reorderPropertyMedia(
  mediaId: string,
  direction: "up" | "down",
): Promise<ActionResult> {
  const context = await requireOrganizationContext();
  if (!context.organization) return { ok: false, error: "No organization." };
  const supabase = createClient();
  const { data: current } = await supabase
    .from("property_media")
    .select("id, property_id, sort_order")
    .eq("organization_id", context.organization.id)
    .eq("id", mediaId)
    .maybeSingle();
  if (!current) return { ok: false, error: "Media not found." };
  const { data: list } = await supabase
    .from("property_media")
    .select("id, sort_order")
    .eq("property_id", current.property_id)
    .order("sort_order", { ascending: true });
  if (!list) return { ok: false, error: "No media list." };
  const index = list.findIndex((row) => row.id === current.id);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= list.length) {
    return { ok: true };
  }
  const swap = list[swapIndex];
  if (!swap) return { ok: true };
  await supabase
    .from("property_media")
    .update({ sort_order: swap.sort_order })
    .eq("id", current.id);
  await supabase
    .from("property_media")
    .update({ sort_order: current.sort_order })
    .eq("id", swap.id);
  revalidatePath(editPath(current.property_id));
  return { ok: true };
}
