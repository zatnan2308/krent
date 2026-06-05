"use server";

import { revalidatePath } from "next/cache";

import { getClientEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/types/database";
import { logAudit } from "@/server/audit";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

import {
  messengerGetPageInfo,
  messengerSubscribeApp,
} from "./adapters/messenger";
import { telegramGetMe, telegramSetWebhook } from "./adapters/telegram";
import {
  whatsappGetPhoneInfo,
  whatsappSubscribeApp,
} from "./adapters/whatsapp";
import { getMessageAdapter } from "./adapters/registry";
import {
  getMessengerConfig,
  getTelegramConfig,
  getWhatsAppConfig,
} from "./config";
import { CHANNEL_HAS_SESSION_WINDOW } from "./channels";
import { recordOutboundMessage } from "./store";
import type { ActionResult } from "./schema";
import type { MessagingChannel } from "./types";

const SESSION_WINDOW_MS = 24 * 60 * 60 * 1000;

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
