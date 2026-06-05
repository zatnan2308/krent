"use server";

import { revalidatePath } from "next/cache";

import { getClientEnv } from "@/lib/env";
import { normalizePhoneE164, phoneToDigits } from "@/lib/phone";
import { createAdminClient } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/types/database";
import { logAudit } from "@/server/audit";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

import {
  messengerGetPageInfo,
  messengerSendTaggedText,
  messengerSubscribeApp,
} from "./adapters/messenger";
import { telegramGetMe, telegramSetWebhook } from "./adapters/telegram";
import {
  whatsappGetPhoneInfo,
  whatsappSendTemplate,
  whatsappSubscribeApp,
} from "./adapters/whatsapp";
import { getMessageAdapter } from "./adapters/registry";
import {
  getMessengerConfig,
  getTelegramConfig,
  getWhatsAppConfig,
} from "./config";
import { CHANNEL_HAS_SESSION_WINDOW } from "./channels";
import {
  createMessagingMediaSignedUrl,
  ensureContactIdentity,
  ensureConversation,
  insertMessagingAttachment,
  recordOutboundMessage,
  uploadMessagingMedia,
} from "./store";
import type { ActionResult } from "./schema";
import type { MessagingChannel } from "./types";

const SESSION_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_MEDIA_SIZE = 20 * 1024 * 1024;
const ALLOWED_MEDIA_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
]);
const MESSENGER_TAGS = new Set([
  "HUMAN_AGENT",
  "ACCOUNT_UPDATE",
  "CONFIRMED_EVENT_UPDATE",
  "POST_PURCHASE_UPDATE",
]);

const INTEGRATIONS_PATH = "/dashboard/integrations";

/** Гард: активная организация + право управлять интеграциями. */
async function requireChannelAccess(): Promise<
  { ok: true; organizationId: string; userId: string } | { ok: false; error: string }
> {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false, error: "No active organization." };
  }
  if (!hasPermission(context, "analytics.view")) {
    return {
      ok: false,
      error: "You do not have permission to manage messaging channels.",
    };
  }
  return {
    ok: true,
    organizationId: context.organization.id,
    userId: context.user.id,
  };
}

/** Upsert строки подключения канала (одна на канал на организацию). */
async function upsertConnection(
  admin: ReturnType<typeof createAdminClient>,
  organizationId: string,
  channel: MessagingChannel,
  fields: TablesUpdate<"messaging_connections">,
): Promise<void> {
  const { data: existing } = await admin
    .from("messaging_connections")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("channel", channel)
    .maybeSingle();
  if (existing) {
    await admin
      .from("messaging_connections")
      .update(fields)
      .eq("id", existing.id);
  } else {
    await admin
      .from("messaging_connections")
      .insert({ organization_id: organizationId, channel, ...fields });
  }
}

/**
 * Подключает Telegram: токен берётся из env (TELEGRAM_BOT_TOKEN), валидируется
 * через getMe, регистрируется вебхук с секретом, запись подключения помечается
 * connected. Никакого ввода токена в UI — self-hosted, креды в env.
 */
export async function connectTelegram(): Promise<ActionResult> {
  const access = await requireChannelAccess();
  if (!access.ok) {
    return access;
  }
  const config = getTelegramConfig();
  if (!config) {
    return {
      ok: false,
      error: "Set TELEGRAM_BOT_TOKEN in the environment first (see SETUP.md).",
    };
  }
  const me = await telegramGetMe(config.botToken);
  if (!me.ok) {
    return { ok: false, error: me.error };
  }
  const webhookUrl = `${getClientEnv().NEXT_PUBLIC_SITE_URL}/api/webhooks/telegram`;
  const hook = await telegramSetWebhook(
    config.botToken,
    webhookUrl,
    config.webhookSecret,
  );
  if (!hook.ok) {
    return { ok: false, error: hook.error ?? "Could not register webhook." };
  }

  const admin = createAdminClient();
  await upsertConnection(admin, access.organizationId, "telegram", {
    bot_username: me.username,
    display_name: `@${me.username}`,
    status: "connected",
    error_message: null,
    created_by: access.userId,
  });
  revalidatePath(INTEGRATIONS_PATH);
  return { ok: true };
}

/**
 * Подключает WhatsApp Cloud API: креды из env (номер/токен/app secret/verify
 * token покупателя). Тянет display_phone_number/verified_name, подписывает
 * приложение на вебхуки WABA (best-effort) и помечает подключение connected.
 * Сам вебхук покупатель прописывает в консоли Meta — см. SETUP.md.
 */
export async function connectWhatsApp(): Promise<ActionResult> {
  const access = await requireChannelAccess();
  if (!access.ok) {
    return access;
  }
  const config = getWhatsAppConfig();
  if (!config) {
    return {
      ok: false,
      error:
        "Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN in the environment first (see SETUP.md).",
    };
  }
  const info = await whatsappGetPhoneInfo(config);
  await whatsappSubscribeApp(config);

  const admin = createAdminClient();
  await upsertConnection(admin, access.organizationId, "whatsapp_cloud", {
    phone_number_id: config.phoneNumberId,
    waba_id: config.wabaId,
    phone_display: info.displayPhone,
    display_name: info.verifiedName ?? info.displayPhone ?? "WhatsApp",
    status: "connected",
    error_message: null,
    created_by: access.userId,
  });
  revalidatePath(INTEGRATIONS_PATH);
  return { ok: true };
}

/**
 * Подключает Facebook Messenger: Page id/token + app secret/verify token
 * покупателя из env. Тянет имя страницы, подписывает приложение на вебхуки
 * страницы (messages, messaging_postbacks) и помечает подключение connected.
 */
export async function connectMessenger(): Promise<ActionResult> {
  const access = await requireChannelAccess();
  if (!access.ok) {
    return access;
  }
  const config = getMessengerConfig();
  if (!config) {
    return {
      ok: false,
      error:
        "Set MESSENGER_PAGE_ID and MESSENGER_PAGE_ACCESS_TOKEN in the environment first (see SETUP.md).",
    };
  }
  const info = await messengerGetPageInfo(config);
  await messengerSubscribeApp(config);

  const admin = createAdminClient();
  await upsertConnection(admin, access.organizationId, "messenger", {
    page_id: config.pageId,
    page_name: info.name,
    display_name: info.name ?? "Messenger",
    status: "connected",
    error_message: null,
    created_by: access.userId,
  });
  revalidatePath(INTEGRATIONS_PATH);
  return { ok: true };
}

const MESSAGES_PATH = "/dashboard/messages";

/**
 * Отправляет исходящее сообщение в канал из инбокса. Уважает 24ч-окно
 * (WhatsApp/Messenger): вне окна свободный текст запрещён (нужен шаблон/tag).
 * Telegram — без окна. Никогда не шлём платное автоматически.
 */
export async function sendChannelMessage(input: {
  conversationId: string;
  text: string;
}): Promise<ActionResult> {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false, error: "No active organization." };
  }
  if (!hasPermission(context, "crm.manage")) {
    return { ok: false, error: "You do not have permission to send messages." };
  }
  const text = input.text.trim();
  if (!text) {
    return { ok: false, error: "Message is empty." };
  }
  const organizationId = context.organization.id;
  const admin = createAdminClient();

  const { data: conversation } = await admin
    .from("messaging_conversations")
    .select(
      "id, channel, channel_identity_id, connection_id, contact_id, last_inbound_at",
    )
    .eq("organization_id", organizationId)
    .eq("id", input.conversationId)
    .maybeSingle();
  if (!conversation || !conversation.channel_identity_id) {
    return { ok: false, error: "Conversation not found." };
  }

  // 24ч-окно для WA/Messenger.
  if (CHANNEL_HAS_SESSION_WINDOW[conversation.channel]) {
    const open =
      conversation.last_inbound_at &&
      Date.now() - new Date(conversation.last_inbound_at).getTime() <
        SESSION_WINDOW_MS;
    if (!open) {
      return {
        ok: false,
        error:
          "The 24-hour window is closed — an approved template/tag is required.",
      };
    }
  }

  const { data: identity } = await admin
    .from("contact_channel_identities")
    .select("external_id")
    .eq("id", conversation.channel_identity_id)
    .maybeSingle();
  if (!identity?.external_id) {
    return { ok: false, error: "Recipient identity not found." };
  }

  const { data: connection } = await admin
    .from("messaging_connections")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("channel", conversation.channel)
    .maybeSingle();
  if (!connection || connection.status !== "connected") {
    return { ok: false, error: "This channel is not connected." };
  }

  const adapter = getMessageAdapter(conversation.channel);
  const result = await adapter.sendText(connection, {
    to: identity.external_id,
    text,
  });
  if (!result.ok) {
    return { ok: false, error: result.error ?? "Could not send the message." };
  }

  await recordOutboundMessage(admin, {
    organizationId,
    channel: conversation.channel,
    conversationId: conversation.id,
    senderUserId: context.user.id,
    body: text,
    externalMessageId: result.externalMessageId ?? null,
    status: "sent",
  });
  // Активность на таймлайне контакта.
  if (conversation.contact_id) {
    await logAudit({
      organizationId,
      userId: context.user.id,
      action: "messaging.sent",
      entityType: "contact",
      entityId: conversation.contact_id,
      metadata: { channel: conversation.channel },
    });
  }
  revalidatePath(MESSAGES_PATH);
  return { ok: true };
}

/**
 * Прикрепляет объект к каналу: отправляет название + ссылку на листинг (и
 * обложку, если доступна). Уважает то же 24ч-окно.
 */
export async function sendChannelProperty(input: {
  conversationId: string;
  propertyId: string;
}): Promise<ActionResult> {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false, error: "No active organization." };
  }
  if (!hasPermission(context, "crm.manage")) {
    return { ok: false, error: "You do not have permission to send messages." };
  }
  const organizationId = context.organization.id;
  const admin = createAdminClient();

  const { data: conversation } = await admin
    .from("messaging_conversations")
    .select("id, channel, channel_identity_id, contact_id, last_inbound_at")
    .eq("organization_id", organizationId)
    .eq("id", input.conversationId)
    .maybeSingle();
  if (!conversation || !conversation.channel_identity_id) {
    return { ok: false, error: "Conversation not found." };
  }
  if (CHANNEL_HAS_SESSION_WINDOW[conversation.channel]) {
    const open =
      conversation.last_inbound_at &&
      Date.now() - new Date(conversation.last_inbound_at).getTime() <
        SESSION_WINDOW_MS;
    if (!open) {
      return {
        ok: false,
        error: "The 24-hour window is closed — a template/tag is required.",
      };
    }
  }

  const { data: property } = await admin
    .from("properties")
    .select("id, title, slug")
    .eq("organization_id", organizationId)
    .eq("id", input.propertyId)
    .maybeSingle();
  if (!property) {
    return { ok: false, error: "Property not found." };
  }
  const { data: cover } = await admin
    .from("property_media")
    .select("url, category")
    .eq("property_id", property.id)
    .order("sort_order", { ascending: true })
    .limit(20);
  const coverUrl =
    cover?.find((m) => m.category === "cover")?.url ?? cover?.[0]?.url ?? null;

  const siteUrl = getClientEnv().NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const locale = context.organization.default_language;
  const listingUrl = `${siteUrl}/${locale}/properties/${property.slug}`;
  const body = `${property.title}\n${listingUrl}`;

  const { data: identity } = await admin
    .from("contact_channel_identities")
    .select("external_id")
    .eq("id", conversation.channel_identity_id)
    .maybeSingle();
  if (!identity?.external_id) {
    return { ok: false, error: "Recipient identity not found." };
  }
  const { data: connection } = await admin
    .from("messaging_connections")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("channel", conversation.channel)
    .maybeSingle();
  if (!connection || connection.status !== "connected") {
    return { ok: false, error: "This channel is not connected." };
  }

  const adapter = getMessageAdapter(conversation.channel);
  const result = coverUrl
    ? await adapter.sendMedia(connection, {
        to: identity.external_id,
        mediaUrl: coverUrl,
        kind: "image",
        caption: body,
      })
    : await adapter.sendText(connection, {
        to: identity.external_id,
        text: body,
      });
  if (!result.ok) {
    return { ok: false, error: result.error ?? "Could not send the property." };
  }

  await recordOutboundMessage(admin, {
    organizationId,
    channel: conversation.channel,
    conversationId: conversation.id,
    senderUserId: context.user.id,
    body,
    externalMessageId: result.externalMessageId ?? null,
    status: "sent",
  });
  revalidatePath(MESSAGES_PATH);
  return { ok: true };
}

/**
 * Отправляет файл/изображение из composer: загружает в приватный бакет,
 * подписывает URL (канал скачает), шлёт через adapter.sendMedia, пишет
 * исходящее + вложение. Уважает то же 24ч-окно. Запись — service-role.
 */
export async function sendChannelMedia(
  formData: FormData,
): Promise<ActionResult> {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false, error: "No active organization." };
  }
  if (!hasPermission(context, "crm.manage")) {
    return { ok: false, error: "You do not have permission to send messages." };
  }

  const conversationId = formData.get("conversationId");
  const file = formData.get("file");
  const captionValue = formData.get("caption");
  const caption =
    typeof captionValue === "string" ? captionValue.trim() : "";
  if (typeof conversationId !== "string" || !(file instanceof File)) {
    return { ok: false, error: "Invalid upload." };
  }
  if (file.size === 0 || file.size > MAX_MEDIA_SIZE) {
    return { ok: false, error: "File must be between 1 byte and 20MB." };
  }
  if (!ALLOWED_MEDIA_MIME.has(file.type)) {
    return { ok: false, error: "This file type is not allowed." };
  }

  const organizationId = context.organization.id;
  const admin = createAdminClient();

  const { data: conversation } = await admin
    .from("messaging_conversations")
    .select("id, channel, channel_identity_id, contact_id, last_inbound_at")
    .eq("organization_id", organizationId)
    .eq("id", conversationId)
    .maybeSingle();
  if (!conversation || !conversation.channel_identity_id) {
    return { ok: false, error: "Conversation not found." };
  }
  if (CHANNEL_HAS_SESSION_WINDOW[conversation.channel]) {
    const open =
      conversation.last_inbound_at &&
      Date.now() - new Date(conversation.last_inbound_at).getTime() <
        SESSION_WINDOW_MS;
    if (!open) {
      return {
        ok: false,
        error: "The 24-hour window is closed — a template/tag is required.",
      };
    }
  }

  const { data: identity } = await admin
    .from("contact_channel_identities")
    .select("external_id")
    .eq("id", conversation.channel_identity_id)
    .maybeSingle();
  if (!identity?.external_id) {
    return { ok: false, error: "Recipient identity not found." };
  }
  const { data: connection } = await admin
    .from("messaging_connections")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("channel", conversation.channel)
    .maybeSingle();
  if (!connection || connection.status !== "connected") {
    return { ok: false, error: "This channel is not connected." };
  }

  const data = await file.arrayBuffer();
  const storagePath = await uploadMessagingMedia(admin, {
    organizationId,
    conversationId: conversation.id,
    fileName: file.name,
    mimeType: file.type,
    data,
  });
  if (!storagePath) {
    return { ok: false, error: "Could not upload the file." };
  }
  const signedUrl = await createMessagingMediaSignedUrl(admin, storagePath);
  if (!signedUrl) {
    return { ok: false, error: "Could not prepare the file for sending." };
  }

  const kind = file.type.startsWith("image/") ? "image" : "document";
  const adapter = getMessageAdapter(conversation.channel);
  const result = await adapter.sendMedia(connection, {
    to: identity.external_id,
    mediaUrl: signedUrl,
    kind,
    caption: caption || undefined,
    fileName: file.name,
  });
  if (!result.ok) {
    return { ok: false, error: result.error ?? "Could not send the file." };
  }

  const messageId = await recordOutboundMessage(admin, {
    organizationId,
    channel: conversation.channel,
    conversationId: conversation.id,
    senderUserId: context.user.id,
    body: caption,
    externalMessageId: result.externalMessageId ?? null,
    status: "sent",
  });
  if (messageId) {
    await insertMessagingAttachment(admin, {
      organizationId,
      conversationId: conversation.id,
      messageId,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      storagePath,
    });
  }
  if (conversation.contact_id) {
    await logAudit({
      organizationId,
      userId: context.user.id,
      action: "messaging.sent",
      entityType: "contact",
      entityId: conversation.contact_id,
      metadata: { channel: conversation.channel, attachment: true },
    });
  }
  revalidatePath(MESSAGES_PATH);
  return { ok: true };
}

/**
 * Отправляет одобренный WhatsApp-шаблон (повторный контакт вне 24ч-окна).
 * Только для WhatsApp; шаблон — by-name без параметров (см. whatsappListTemplates).
 */
export async function sendChannelTemplate(input: {
  conversationId: string;
  templateName: string;
  language: string;
}): Promise<ActionResult> {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false, error: "No active organization." };
  }
  if (!hasPermission(context, "crm.manage")) {
    return { ok: false, error: "You do not have permission to send messages." };
  }
  const templateName = input.templateName.trim();
  const language = input.language.trim();
  if (!templateName || !language) {
    return { ok: false, error: "Pick a template first." };
  }
  const organizationId = context.organization.id;
  const admin = createAdminClient();

  const { data: conversation } = await admin
    .from("messaging_conversations")
    .select("id, channel, channel_identity_id, contact_id")
    .eq("organization_id", organizationId)
    .eq("id", input.conversationId)
    .maybeSingle();
  if (!conversation || !conversation.channel_identity_id) {
    return { ok: false, error: "Conversation not found." };
  }
  if (conversation.channel !== "whatsapp_cloud") {
    return { ok: false, error: "Templates are available for WhatsApp only." };
  }

  const { data: identity } = await admin
    .from("contact_channel_identities")
    .select("external_id")
    .eq("id", conversation.channel_identity_id)
    .maybeSingle();
  if (!identity?.external_id) {
    return { ok: false, error: "Recipient identity not found." };
  }
  const { data: connection } = await admin
    .from("messaging_connections")
    .select("status")
    .eq("organization_id", organizationId)
    .eq("channel", "whatsapp_cloud")
    .maybeSingle();
  if (!connection || connection.status !== "connected") {
    return { ok: false, error: "This channel is not connected." };
  }

  const result = await whatsappSendTemplate(
    identity.external_id,
    templateName,
    language,
  );
  if (!result.ok) {
    return { ok: false, error: result.error ?? "Could not send the template." };
  }

  await recordOutboundMessage(admin, {
    organizationId,
    channel: "whatsapp_cloud",
    conversationId: conversation.id,
    senderUserId: context.user.id,
    body: `Template: ${templateName}`,
    externalMessageId: result.externalMessageId ?? null,
    status: "sent",
  });
  if (conversation.contact_id) {
    await logAudit({
      organizationId,
      userId: context.user.id,
      action: "messaging.sent",
      entityType: "contact",
      entityId: conversation.contact_id,
      metadata: { channel: "whatsapp_cloud", template: templateName },
    });
  }
  revalidatePath(MESSAGES_PATH);
  return { ok: true };
}

/**
 * Отправляет текст в Messenger с message tag (повторный контакт вне 24ч-окна).
 * Только Messenger; тег выбирает оператор по политике Messenger Platform.
 */
export async function sendChannelTag(input: {
  conversationId: string;
  text: string;
  tag: string;
}): Promise<ActionResult> {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false, error: "No active organization." };
  }
  if (!hasPermission(context, "crm.manage")) {
    return { ok: false, error: "You do not have permission to send messages." };
  }
  const text = input.text.trim();
  if (!text) {
    return { ok: false, error: "Message is empty." };
  }
  if (!MESSENGER_TAGS.has(input.tag)) {
    return { ok: false, error: "Pick a valid message tag." };
  }
  const organizationId = context.organization.id;
  const admin = createAdminClient();

  const { data: conversation } = await admin
    .from("messaging_conversations")
    .select("id, channel, channel_identity_id, contact_id")
    .eq("organization_id", organizationId)
    .eq("id", input.conversationId)
    .maybeSingle();
  if (!conversation || !conversation.channel_identity_id) {
    return { ok: false, error: "Conversation not found." };
  }
  if (conversation.channel !== "messenger") {
    return { ok: false, error: "Message tags are available for Messenger only." };
  }

  const { data: identity } = await admin
    .from("contact_channel_identities")
    .select("external_id")
    .eq("id", conversation.channel_identity_id)
    .maybeSingle();
  if (!identity?.external_id) {
    return { ok: false, error: "Recipient identity not found." };
  }
  const { data: connection } = await admin
    .from("messaging_connections")
    .select("status")
    .eq("organization_id", organizationId)
    .eq("channel", "messenger")
    .maybeSingle();
  if (!connection || connection.status !== "connected") {
    return { ok: false, error: "This channel is not connected." };
  }

  const result = await messengerSendTaggedText(
    identity.external_id,
    text,
    input.tag,
  );
  if (!result.ok) {
    return { ok: false, error: result.error ?? "Could not send the message." };
  }

  await recordOutboundMessage(admin, {
    organizationId,
    channel: "messenger",
    conversationId: conversation.id,
    senderUserId: context.user.id,
    body: text,
    externalMessageId: result.externalMessageId ?? null,
    status: "sent",
  });
  if (conversation.contact_id) {
    await logAudit({
      organizationId,
      userId: context.user.id,
      action: "messaging.sent",
      entityType: "contact",
      entityId: conversation.contact_id,
      metadata: { channel: "messenger", tag: input.tag },
    });
  }
  revalidatePath(MESSAGES_PATH);
  return { ok: true };
}

/**
 * Шлёт гостю подтверждение брони одобренным WhatsApp-шаблоном
 * (`WHATSAPP_BOOKING_TEMPLATE`, переменные {{1}} объект, {{2}} заезд,
 * {{3}} выезд, {{4}} референс). Бизнес-инициированный шаблон разрешён вне
 * окна. Создаёт/находит WhatsApp-диалог гостя и пишет исходящее.
 */
export async function sendBookingWhatsAppConfirmation(
  bookingId: string,
): Promise<ActionResult> {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false, error: "No active organization." };
  }
  if (!hasPermission(context, "bookings.manage")) {
    return { ok: false, error: "You do not have permission to manage bookings." };
  }
  const config = getWhatsAppConfig();
  if (!config) {
    return { ok: false, error: "WhatsApp is not configured (see SETUP.md)." };
  }
  if (!config.bookingTemplate) {
    return {
      ok: false,
      error: "Set WHATSAPP_BOOKING_TEMPLATE in the environment first (see SETUP.md).",
    };
  }
  const organizationId = context.organization.id;
  const admin = createAdminClient();

  const { data: booking } = await admin
    .from("rental_bookings")
    .select(
      "id, guest_name, guest_phone, guest_contact_id, check_in, check_out, reference, property_id",
    )
    .eq("organization_id", organizationId)
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) {
    return { ok: false, error: "Booking not found." };
  }
  const e164 = normalizePhoneE164(booking.guest_phone ?? "");
  if (!e164) {
    return { ok: false, error: "This booking has no valid guest phone number." };
  }

  const { data: connection } = await admin
    .from("messaging_connections")
    .select("id, status")
    .eq("organization_id", organizationId)
    .eq("channel", "whatsapp_cloud")
    .maybeSingle();
  if (!connection || connection.status !== "connected") {
    return { ok: false, error: "Connect WhatsApp first (Integrations)." };
  }

  const { data: property } = booking.property_id
    ? await admin
        .from("properties")
        .select("title")
        .eq("id", booking.property_id)
        .maybeSingle()
    : { data: null };

  const recipient = phoneToDigits(e164);
  const result = await whatsappSendTemplate(
    recipient,
    config.bookingTemplate,
    config.bookingTemplateLang,
    [
      property?.title ?? "your booking",
      booking.check_in,
      booking.check_out,
      booking.reference,
    ],
  );
  if (!result.ok) {
    return { ok: false, error: result.error ?? "Could not send the confirmation." };
  }

  // Записываем исходящее в WhatsApp-диалог гостя (создаём при необходимости).
  const identity = await ensureContactIdentity(admin, {
    organizationId,
    channel: "whatsapp_cloud",
    externalId: recipient,
    phone: e164,
    name: booking.guest_name,
    preferredContactId: booking.guest_contact_id,
  });
  if (identity) {
    const conversationId = await ensureConversation(admin, {
      organizationId,
      channel: "whatsapp_cloud",
      connectionId: connection.id,
      contactId: identity.contactId,
      identityId: identity.identityId,
      propertyId: booking.property_id,
    });
    if (conversationId) {
      await recordOutboundMessage(admin, {
        organizationId,
        channel: "whatsapp_cloud",
        conversationId,
        senderUserId: context.user.id,
        body: `Booking confirmation sent (${booking.reference})`,
        externalMessageId: result.externalMessageId ?? null,
        status: "sent",
      });
    }
  }

  await logAudit({
    organizationId,
    userId: context.user.id,
    action: "messaging.sent",
    entityType: "booking",
    entityId: booking.id,
    metadata: { channel: "whatsapp_cloud", template: config.bookingTemplate },
  });
  revalidatePath(`/dashboard/bookings/${booking.id}`);
  return { ok: true };
}

/** Отмечает канальный диалог прочитанным для текущего пользователя. */
export async function markChannelConversationRead(
  conversationId: string,
): Promise<ActionResult> {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false, error: "No active organization." };
  }
  const admin = createAdminClient();
  await admin.from("messaging_read_state").upsert(
    {
      conversation_id: conversationId,
      organization_id: context.organization.id,
      user_id: context.user.id,
      last_read_at: new Date().toISOString(),
    },
    { onConflict: "conversation_id,user_id" },
  );
  return { ok: true };
}

/** Помечает канал отключённым (вебхук Telegram можно снять вручную). */
export async function disconnectChannel(
  channel: MessagingChannel,
): Promise<ActionResult> {
  const access = await requireChannelAccess();
  if (!access.ok) {
    return access;
  }
  const admin = createAdminClient();
  await admin
    .from("messaging_connections")
    .update({ status: "disconnected" })
    .eq("organization_id", access.organizationId)
    .eq("channel", channel);
  revalidatePath(INTEGRATIONS_PATH);
  return { ok: true };
}
