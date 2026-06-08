"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/server/auth";
import { logAudit } from "@/server/audit";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

const BUCKET = "client-documents";
const MAX_BYTES = 20 * 1024 * 1024; // 20 МБ
const SIGNED_TTL = 60; // секунд

type SimpleResult = { ok: true } | { ok: false; error: string };
type UrlResult = { ok: true; url: string } | { ok: false; error: string };

/** Безопасное имя файла для Storage-ключа (без путей/спецсимволов). */
function safeFileName(name: string): string {
  const cleaned = name
    .replace(/[\\/]+/g, "_")
    .replace(/[^\w.\- ]+/g, "_")
    .trim()
    .slice(0, 120);
  return cleaned.length > 0 ? cleaned : "document";
}

/** Агент загружает документ клиента (CRM-карточка контакта). */
export async function uploadClientDocument(
  formData: FormData,
): Promise<SimpleResult> {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false, error: "No active organization." };
  }
  if (!hasPermission(context, "crm.manage")) {
    return {
      ok: false,
      error: "You do not have permission to manage documents.",
    };
  }
  const contactId = formData.get("contactId");
  const file = formData.get("file");
  if (typeof contactId !== "string" || !(file instanceof File)) {
    return { ok: false, error: "Choose a file to upload." };
  }
  if (file.size === 0) {
    return { ok: false, error: "The selected file is empty." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "File is too large (max 20 MB)." };
  }

  const organizationId = context.organization.id;
  const admin = createAdminClient();
  const { data: contact } = await admin
    .from("contacts")
    .select("id")
    .eq("id", contactId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (!contact) {
    return { ok: false, error: "Contact not found." };
  }

  const name = safeFileName(file.name);
  const path = `${organizationId}/${contactId}/${crypto.randomUUID()}-${name}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(path, bytes, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
  if (uploadError) {
    return { ok: false, error: "Could not upload the file." };
  }

  const { error: insertError } = await admin.from("client_documents").insert({
    organization_id: organizationId,
    contact_id: contactId,
    uploaded_by: context.user.id,
    file_path: path,
    file_name: name,
    mime_type: file.type || null,
    size_bytes: file.size,
    portal_visible: true,
  });
  if (insertError) {
    // Откат: удаляем загруженный объект, чтобы не плодить «сирот».
    await admin.storage.from(BUCKET).remove([path]);
    return { ok: false, error: "Could not save the document." };
  }

  await logAudit({
    organizationId,
    userId: context.user.id,
    action: "document.uploaded",
    entityType: "contact",
    entityId: contactId,
    metadata: { file: name },
  });
  revalidatePath(`/dashboard/crm/contacts/${contactId}`);
  return { ok: true };
}

/** Агент удаляет документ клиента. */
export async function deleteClientDocument(
  documentId: string,
): Promise<SimpleResult> {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false, error: "No active organization." };
  }
  if (!hasPermission(context, "crm.manage")) {
    return {
      ok: false,
      error: "You do not have permission to manage documents.",
    };
  }
  const admin = createAdminClient();
  const { data: doc } = await admin
    .from("client_documents")
    .select("id, contact_id, file_path")
    .eq("id", documentId)
    .eq("organization_id", context.organization.id)
    .maybeSingle();
  if (!doc) {
    return { ok: false, error: "Document not found." };
  }
  await admin.storage.from(BUCKET).remove([doc.file_path]);
  const { error } = await admin
    .from("client_documents")
    .delete()
    .eq("id", documentId)
    .eq("organization_id", context.organization.id);
  if (error) {
    return { ok: false, error: "Could not delete the document." };
  }
  await logAudit({
    organizationId: context.organization.id,
    userId: context.user.id,
    action: "document.deleted",
    entityType: "contact",
    entityId: doc.contact_id,
    metadata: {},
  });
  revalidatePath(`/dashboard/crm/contacts/${doc.contact_id}`);
  return { ok: true };
}

/** Короткоживущий signed URL для агента (CRM, право crm.view). */
export async function getAgentDocumentUrl(
  documentId: string,
): Promise<UrlResult> {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false, error: "No active organization." };
  }
  if (!hasPermission(context, "crm.view")) {
    return { ok: false, error: "You do not have access to documents." };
  }
  const admin = createAdminClient();
  const { data: doc } = await admin
    .from("client_documents")
    .select("file_path")
    .eq("id", documentId)
    .eq("organization_id", context.organization.id)
    .maybeSingle();
  if (!doc) {
    return { ok: false, error: "Document not found." };
  }
  const { data: signed, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(doc.file_path, SIGNED_TTL);
  if (error || !signed) {
    return { ok: false, error: "Could not prepare the download." };
  }
  return { ok: true, url: signed.signedUrl };
}

/**
 * Короткоживущий signed URL для клиента портала. Доступ — только если документ
 * принадлежит контакту активного портального аккаунта текущего пользователя и
 * помечен видимым в портале.
 */
export async function getPortalDocumentUrl(
  documentId: string,
): Promise<UrlResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "You are not signed in." };
  }
  // portal_accounts читаются под RLS — пользователь видит только свои строки.
  const supabase = createClient();
  const { data: accounts } = await supabase
    .from("portal_accounts")
    .select("contact_id")
    .eq("user_id", user.id)
    .eq("status", "active");
  const contactIds = new Set((accounts ?? []).map((row) => row.contact_id));
  if (contactIds.size === 0) {
    return { ok: false, error: "No portal access." };
  }

  const admin = createAdminClient();
  const { data: doc } = await admin
    .from("client_documents")
    .select("contact_id, file_path, portal_visible")
    .eq("id", documentId)
    .maybeSingle();
  if (!doc || !doc.portal_visible || !contactIds.has(doc.contact_id)) {
    return { ok: false, error: "Document not available." };
  }
  const { data: signed, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(doc.file_path, SIGNED_TTL);
  if (error || !signed) {
    return { ok: false, error: "Could not prepare the download." };
  }
  return { ok: true, url: signed.signedUrl };
}
