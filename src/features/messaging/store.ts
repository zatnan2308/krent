import { normalizePhoneE164, phoneToDigits } from "@/lib/phone";
import { createAdminClient } from "@/lib/supabase/server";
import type { Enums } from "@/types/database";

import type { MessagingChannel, MessagingConnection } from "./types";

type Admin = ReturnType<typeof createAdminClient>;

const MESSAGING_BUCKET = "messaging-media";

/** Категория вложения по MIME. */
export function attachmentTypeFromMime(
  mime: string,
): Enums<"attachment_type"> {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  return "document";
}

/** Понятное имя контакта по умолчанию, когда канал не дал имени. */
function fallbackContactName(
  channel: MessagingChannel,
  externalId: string,
): string {
  if (channel === "whatsapp_cloud") return `WhatsApp ${externalId}`;
  if (channel === "telegram") return `Telegram ${externalId}`;
  return `Messenger ${externalId}`;
}

/**
 * Находит активное подключение канала по входящему идентификатору
 * маршрутизации → организация. Self-hosted: обычно одна строка на канал,
 * но проверка по id гарантирует, что обрабатываем «свой» вебхук.
 */
export async function resolveConnectionByRouting(
  admin: Admin,
  channel: MessagingChannel,
  routing: { phoneNumberId?: string; pageId?: string },
): Promise<MessagingConnection | null> {
  let query = admin
    .from("messaging_connections")
    .select("*")
    .eq("channel", channel)
    .eq("status", "connected");
  if (channel === "whatsapp_cloud" && routing.phoneNumberId) {
    query = query.eq("phone_number_id", routing.phoneNumberId);
  } else if (channel === "messenger" && routing.pageId) {
    query = query.eq("page_id", routing.pageId);
  } else if (channel === "telegram") {
    // Один бот на инстанс — берём единственное активное подключение.
  } else {
    return null;
  }
  const { data } = await query
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

/**
 * Матчит/создаёт контакт и его идентичность в канале по входящему отправителю.
 *  - WhatsApp: матч по нормализованному телефону к существующему контакту;
 *  - Telegram/Messenger: матч по external_id идентичности, иначе новый контакт.
 */
export async function ensureContactIdentity(
  admin: Admin,
  params: {
    organizationId: string;
    channel: MessagingChannel;
    externalId: string;
    handle?: string | null;
    name?: string | null;
    phone?: string | null;
    /** Привязать идентичность к этому контакту (deep-link к лиду/контакту). */
    preferredContactId?: string | null;
  },
): Promise<{ contactId: string; identityId: string } | null> {
  const { organizationId, channel } = params;
  const externalId = params.externalId.trim();
  if (!externalId) {
    return null;
  }

  // 1) Уже есть идентичность с таким external_id?
  const { data: existing } = await admin
    .from("contact_channel_identities")
    .select("id, contact_id")
    .eq("organization_id", organizationId)
    .eq("channel", channel)
    .eq("external_id", externalId)
    .maybeSingle();
  if (existing) {
    return { contactId: existing.contact_id, identityId: existing.id };
  }

  // 2) WhatsApp: пробуем сматчить по телефону к существующему контакту.
  let contactId: string | null = null;
  if (channel === "whatsapp_cloud") {
    const e164 = normalizePhoneE164(params.phone ?? externalId);
    if (e164) {
      const digits = phoneToDigits(e164);
      const candidates = [...new Set([e164, digits, `+${digits}`, externalId])];
      const { data: byPhone } = await admin
        .from("contacts")
        .select("id, phone")
        .eq("organization_id", organizationId)
        .in("phone", candidates)
        .limit(1);
      if (byPhone && byPhone[0]) {
        contactId = byPhone[0].id;
      }
    }
  }

  // 3) Привязка к контакту из deep-link (например, лида), если задана.
  if (!contactId && params.preferredContactId) {
    contactId = params.preferredContactId;
  }

  // 4) Контакта нет — создаём.
  if (!contactId) {
    const name =
      (params.name ?? "").trim() ||
      (params.handle ?? "").trim() ||
      fallbackContactName(channel, externalId);
    const phone =
      channel === "whatsapp_cloud"
        ? normalizePhoneE164(params.phone ?? externalId)
        : null;
    const { data: created } = await admin
      .from("contacts")
      .insert({ organization_id: organizationId, full_name: name, phone })
      .select("id")
      .single();
    if (!created) {
      return null;
    }
    contactId = created.id;
  }

  // 5) Создаём идентичность (с защитой от гонки по unique-индексу).
  const { data: identity, error } = await admin
    .from("contact_channel_identities")
    .insert({
      organization_id: organizationId,
      contact_id: contactId,
      channel,
      external_id: externalId,
      handle: params.handle ?? null,
    })
    .select("id")
    .single();
  if (error || !identity) {
    const { data: retry } = await admin
      .from("contact_channel_identities")
      .select("id, contact_id")
      .eq("organization_id", organizationId)
      .eq("channel", channel)
      .eq("external_id", externalId)
      .maybeSingle();
    if (retry) {
      return { contactId: retry.contact_id, identityId: retry.id };
    }
    return null;
  }
  return { contactId, identityId: identity.id };
}

/** Находит/создаёт диалог канала по идентичности контакта (один тред). */
export async function ensureConversation(
  admin: Admin,
  params: {
    organizationId: string;
    channel: MessagingChannel;
    connectionId: string | null;
    contactId: string;
    identityId: string;
    leadId?: string | null;
    propertyId?: string | null;
  },
): Promise<string | null> {
  const { data: existing } = await admin
    .from("messaging_conversations")
    .select("id")
    .eq("organization_id", params.organizationId)
    .eq("channel", params.channel)
    .eq("channel_identity_id", params.identityId)
    .maybeSingle();
  if (existing) {
    return existing.id;
  }
  const { data: created, error } = await admin
    .from("messaging_conversations")
    .insert({
      organization_id: params.organizationId,
      channel: params.channel,
      connection_id: params.connectionId,
      contact_id: params.contactId,
      channel_identity_id: params.identityId,
      lead_id: params.leadId ?? null,
      property_id: params.propertyId ?? null,
    })
    .select("id")
    .single();
  if (error || !created) {
    const { data: retry } = await admin
      .from("messaging_conversations")
      .select("id")
      .eq("organization_id", params.organizationId)
      .eq("channel", params.channel)
      .eq("channel_identity_id", params.identityId)
      .maybeSingle();
    return retry?.id ?? null;
  }
  return created.id;
}

/**
 * Записывает входящее сообщение (идемпотентно по external_message_id) и
 * двигает временные метки диалога (для бейджа непрочитанного и сортировки).
 */
export async function recordInboundMessage(
  admin: Admin,
  params: {
    organizationId: string;
    channel: MessagingChannel;
    conversationId: string;
    externalMessageId?: string | null;
    body: string;
  },
): Promise<{ messageId: string; isNew: boolean } | null> {
  if (params.externalMessageId) {
    const { data: dup } = await admin
      .from("messaging_messages")
      .select("id")
      .eq("channel", params.channel)
      .eq("external_message_id", params.externalMessageId)
      .maybeSingle();
    if (dup) {
      return { messageId: dup.id, isNew: false };
    }
  }
  const { data: message, error } = await admin
    .from("messaging_messages")
    .insert({
      organization_id: params.organizationId,
      conversation_id: params.conversationId,
      channel: params.channel,
      direction: "inbound",
      status: "received",
      external_message_id: params.externalMessageId ?? null,
      body: params.body,
    })
    .select("id")
    .single();
  if (error || !message) {
    if (params.externalMessageId) {
      const { data: dup } = await admin
        .from("messaging_messages")
        .select("id")
        .eq("channel", params.channel)
        .eq("external_message_id", params.externalMessageId)
        .maybeSingle();
      if (dup) {
        return { messageId: dup.id, isNew: false };
      }
    }
    return null;
  }
  const now = new Date().toISOString();
  await admin
    .from("messaging_conversations")
    .update({ last_message_at: now, last_inbound_at: now })
    .eq("id", params.conversationId);
  return { messageId: message.id, isNew: true };
}

/**
 * Сохраняет входящее медиа в приватный бакет messaging-media и создаёт строку
 * вложения. Файл скачивает вызывающий код канала (у него есть токен/URL).
 */
export async function attachInboundMedia(
  admin: Admin,
  params: {
    organizationId: string;
    conversationId: string;
    messageId: string;
    fileName: string;
    mimeType: string;
    data: ArrayBuffer;
    externalMediaId?: string | null;
  },
): Promise<void> {
  const safeExt =
    params.fileName.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ||
    "bin";
  const storagePath = `${params.organizationId}/${params.conversationId}/${crypto.randomUUID()}.${safeExt}`;
  const { error: uploadError } = await admin.storage
    .from(MESSAGING_BUCKET)
    .upload(storagePath, params.data, {
      contentType: params.mimeType,
      upsert: false,
    });
  if (uploadError) {
    return;
  }
  await admin.from("messaging_attachments").insert({
    organization_id: params.organizationId,
    message_id: params.messageId,
    conversation_id: params.conversationId,
    file_name: params.fileName,
    file_size: params.data.byteLength,
    file_type: attachmentTypeFromMime(params.mimeType),
    file_url: storagePath,
    mime_type: params.mimeType,
    external_media_id: params.externalMediaId ?? null,
  });
}

/** Записывает исходящее сообщение и двигает last_message_at диалога. */
export async function recordOutboundMessage(
  admin: Admin,
  params: {
    organizationId: string;
    channel: MessagingChannel;
    conversationId: string;
    senderUserId: string;
    body: string;
    externalMessageId?: string | null;
    status?: "queued" | "sent" | "failed";
  },
): Promise<string | null> {
  const { data: message } = await admin
    .from("messaging_messages")
    .insert({
      organization_id: params.organizationId,
      conversation_id: params.conversationId,
      channel: params.channel,
      direction: "outbound",
      status: params.status ?? "sent",
      external_message_id: params.externalMessageId ?? null,
      sender_user_id: params.senderUserId,
      body: params.body,
    })
    .select("id")
    .single();
  if (!message) {
    return null;
  }
  await admin
    .from("messaging_conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", params.conversationId);
  return message.id;
}
