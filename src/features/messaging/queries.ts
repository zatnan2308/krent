import { createAdminClient } from "@/lib/supabase/server";

import {
  CHANNEL_HAS_SESSION_WINDOW,
  CHANNEL_LABELS,
  MESSAGING_CHANNELS,
} from "./channels";
import { isChannelConfigured } from "./config";
import type {
  MessagingChannel,
  MessagingConnectionStatus,
  MessagingDirection,
  MessagingMessageStatus,
} from "./types";

const MESSAGING_BUCKET = "messaging-media";
const SIGNED_URL_TTL = 60 * 60 * 24;
const SESSION_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface ChannelConnectionView {
  channel: MessagingChannel;
  /** Заданы ли обязательные env-секреты канала. */
  configured: boolean;
  status: MessagingConnectionStatus | null;
  displayName: string | null;
  /** Краткая деталь: @bot / номер / имя страницы. */
  detail: string | null;
}

/** Статус всех каналов для карточек на странице Integrations. */
export async function getChannelConnections(
  organizationId: string,
): Promise<ChannelConnectionView[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("messaging_connections")
    .select("*")
    .eq("organization_id", organizationId);
  const byChannel = new Map((data ?? []).map((row) => [row.channel, row]));

  return MESSAGING_CHANNELS.map((channel) => {
    const row = byChannel.get(channel);
    const detail = row
      ? row.bot_username
        ? `@${row.bot_username}`
        : (row.phone_display ?? row.page_name ?? null)
      : null;
    return {
      channel,
      configured: isChannelConfigured(channel),
      status: row?.status ?? null,
      displayName: row?.display_name ?? null,
      detail,
    };
  });
}

// ---- Инбокс: канальные диалоги -------------------------------

export interface ChannelInboxItem {
  id: string;
  channel: MessagingChannel;
  title: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unread: boolean;
}

/** Список канальных диалогов организации для единого инбокса. */
export async function listChannelConversations(
  organizationId: string,
  userId: string,
): Promise<ChannelInboxItem[]> {
  const admin = createAdminClient();
  const { data: conversations } = await admin
    .from("messaging_conversations")
    .select("id, channel, contact_id, last_message_at, last_inbound_at")
    .eq("organization_id", organizationId)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(100);
  const rows = conversations ?? [];
  if (rows.length === 0) {
    return [];
  }
  const ids = rows.map((row) => row.id);
  const contactIds = [
    ...new Set(rows.map((row) => row.contact_id).filter(Boolean)),
  ] as string[];

  const [contactsRes, messagesRes, readsRes] = await Promise.all([
    contactIds.length
      ? admin.from("contacts").select("id, full_name").in("id", contactIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
    admin
      .from("messaging_messages")
      .select("conversation_id, body, created_at")
      .in("conversation_id", ids)
      .order("created_at", { ascending: false }),
    admin
      .from("messaging_read_state")
      .select("conversation_id, last_read_at")
      .eq("user_id", userId)
      .in("conversation_id", ids),
  ]);

  const nameById = new Map(
    (contactsRes.data ?? []).map((c) => [c.id, c.full_name]),
  );
  const lastByConv = new Map<string, string>();
  for (const message of messagesRes.data ?? []) {
    if (!lastByConv.has(message.conversation_id)) {
      lastByConv.set(message.conversation_id, message.body);
    }
  }
  const readByConv = new Map(
    (readsRes.data ?? []).map((r) => [r.conversation_id, r.last_read_at]),
  );

  return rows.map((row) => {
    const lastRead = readByConv.get(row.id) ?? null;
    const unread = Boolean(
      row.last_inbound_at && (!lastRead || row.last_inbound_at > lastRead),
    );
    const preview = lastByConv.get(row.id) ?? null;
    return {
      id: row.id,
      channel: row.channel,
      title: row.contact_id
        ? (nameById.get(row.contact_id) ?? "Contact")
        : "Contact",
      lastMessage: preview ? preview.slice(0, 120) : null,
      lastMessageAt: row.last_message_at,
      unread,
    };
  });
}

export interface ChannelMessageView {
  id: string;
  direction: MessagingDirection;
  status: MessagingMessageStatus;
  body: string;
  createdAt: string;
  attachment: {
    fileName: string;
    fileType: string;
    signedUrl: string | null;
  } | null;
}

export interface ChannelConversationView {
  id: string;
  channel: MessagingChannel;
  contactName: string;
  /** Идентификатор получателя в канале (для отправки). */
  to: string | null;
  /** Открыто ли 24ч-окно (для WA/Messenger); Telegram — всегда true. */
  windowOpen: boolean;
  hasSessionWindow: boolean;
  messages: ChannelMessageView[];
}

/** Полный канальный диалог: сообщения, вложения (signed URL), окно. */
export async function getChannelConversationView(
  organizationId: string,
  conversationId: string,
): Promise<ChannelConversationView | null> {
  const admin = createAdminClient();
  const { data: conversation } = await admin
    .from("messaging_conversations")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", conversationId)
    .maybeSingle();
  if (!conversation) {
    return null;
  }

  const [contactRes, identityRes, messagesRes, attachmentsRes] =
    await Promise.all([
      conversation.contact_id
        ? admin
            .from("contacts")
            .select("full_name")
            .eq("id", conversation.contact_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      conversation.channel_identity_id
        ? admin
            .from("contact_channel_identities")
            .select("external_id")
            .eq("id", conversation.channel_identity_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      admin
        .from("messaging_messages")
        .select("id, direction, status, body, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true }),
      admin
        .from("messaging_attachments")
        .select("message_id, file_name, file_type, file_url")
        .eq("conversation_id", conversationId),
    ]);

  const attachments = attachmentsRes.data ?? [];
  const signedByPath = new Map<string, string>();
  if (attachments.length > 0) {
    const { data: signed } = await admin.storage
      .from(MESSAGING_BUCKET)
      .createSignedUrls(
        attachments.map((a) => a.file_url),
        SIGNED_URL_TTL,
      );
    for (const item of signed ?? []) {
      if (item.path && item.signedUrl) {
        signedByPath.set(item.path, item.signedUrl);
      }
    }
  }
  const attachmentByMessage = new Map(
    attachments.map((a) => [
      a.message_id,
      {
        fileName: a.file_name,
        fileType: a.file_type,
        signedUrl: signedByPath.get(a.file_url) ?? null,
      },
    ]),
  );

  const hasSessionWindow = CHANNEL_HAS_SESSION_WINDOW[conversation.channel];
  const windowOpen =
    !hasSessionWindow ||
    Boolean(
      conversation.last_inbound_at &&
        Date.now() - new Date(conversation.last_inbound_at).getTime() <
          SESSION_WINDOW_MS,
    );

  return {
    id: conversation.id,
    channel: conversation.channel,
    contactName: contactRes.data?.full_name ?? "Contact",
    to: identityRes.data?.external_id ?? null,
    windowOpen,
    hasSessionWindow,
    messages: (messagesRes.data ?? []).map((m) => ({
      id: m.id,
      direction: m.direction,
      status: m.status,
      body: m.body,
      createdAt: m.created_at,
      attachment: attachmentByMessage.get(m.id) ?? null,
    })),
  };
}

/** Количество канальных диалогов с непрочитанным (для бейджа/счётчика). */
export async function getChannelUnreadCount(
  organizationId: string,
  userId: string,
): Promise<number> {
  const items = await listChannelConversations(organizationId, userId);
  return items.filter((item) => item.unread).length;
}

// ---- Контекст-экшены: каналы контакта ------------------------

export interface ContactChannelLink {
  channel: MessagingChannel;
  label: string;
  reachable: boolean;
  conversationId: string | null;
  /** Deep-link/приглашение для каналов без идентичности. */
  inviteUrl: string | null;
}

/** Каналы, на которых достижим контакт (+ приглашение для остальных). */
export async function getContactChannels(
  organizationId: string,
  contactId: string,
): Promise<ContactChannelLink[]> {
  const admin = createAdminClient();
  const [identitiesRes, convsRes, contactRes, connectionsRes] =
    await Promise.all([
      admin
        .from("contact_channel_identities")
        .select("channel")
        .eq("organization_id", organizationId)
        .eq("contact_id", contactId),
      admin
        .from("messaging_conversations")
        .select("id, channel")
        .eq("organization_id", organizationId)
        .eq("contact_id", contactId),
      admin
        .from("contacts")
        .select("phone")
        .eq("id", contactId)
        .maybeSingle(),
      admin
        .from("messaging_connections")
        .select("channel, bot_username, page_id, status")
        .eq("organization_id", organizationId)
        .eq("status", "connected"),
    ]);

  const reachableChannels = new Set(
    (identitiesRes.data ?? []).map((row) => row.channel),
  );
  const convByChannel = new Map<MessagingChannel, string>();
  for (const conv of convsRes.data ?? []) {
    if (!convByChannel.has(conv.channel)) {
      convByChannel.set(conv.channel, conv.id);
    }
  }
  const connByChannel = new Map(
    (connectionsRes.data ?? []).map((row) => [row.channel, row]),
  );
  const phone = contactRes.data?.phone ?? null;
  const phoneDigits = phone ? phone.replace(/[^\d]/g, "") : null;

  return MESSAGING_CHANNELS.map((channel) => {
    const reachable = reachableChannels.has(channel);
    let inviteUrl: string | null = null;
    if (!reachable) {
      if (channel === "whatsapp_cloud" && phoneDigits) {
        inviteUrl = `https://wa.me/${phoneDigits}`;
      } else if (channel === "telegram") {
        const bot = connByChannel.get("telegram")?.bot_username;
        if (bot) inviteUrl = `https://t.me/${bot}`;
      } else if (channel === "messenger") {
        const pageId = connByChannel.get("messenger")?.page_id;
        if (pageId) inviteUrl = `https://m.me/${pageId}`;
      }
    }
    return {
      channel,
      label: CHANNEL_LABELS[channel],
      reachable,
      conversationId: convByChannel.get(channel) ?? null,
      inviteUrl,
    };
  });
}

// ---- Репортинг: статистика по каналам ------------------------

export interface ChannelStat {
  channel: MessagingChannel;
  label: string;
  conversations: number;
  sent: number;
  received: number;
}

/** Счётчики по каналам: диалоги, отправлено/получено сообщений. */
export async function getMessagingStats(
  organizationId: string,
): Promise<ChannelStat[]> {
  const admin = createAdminClient();
  const [convsRes, messagesRes] = await Promise.all([
    admin
      .from("messaging_conversations")
      .select("channel")
      .eq("organization_id", organizationId),
    admin
      .from("messaging_messages")
      .select("channel, direction")
      .eq("organization_id", organizationId),
  ]);

  const convCount = new Map<MessagingChannel, number>();
  for (const row of convsRes.data ?? []) {
    convCount.set(row.channel, (convCount.get(row.channel) ?? 0) + 1);
  }
  const sentCount = new Map<MessagingChannel, number>();
  const recvCount = new Map<MessagingChannel, number>();
  for (const row of messagesRes.data ?? []) {
    const map = row.direction === "outbound" ? sentCount : recvCount;
    map.set(row.channel, (map.get(row.channel) ?? 0) + 1);
  }

  return MESSAGING_CHANNELS.map((channel) => ({
    channel,
    label: CHANNEL_LABELS[channel],
    conversations: convCount.get(channel) ?? 0,
    sent: sentCount.get(channel) ?? 0,
    received: recvCount.get(channel) ?? 0,
  }));
}

// ---- Публичные deep-link кнопки объекта -----------------------

export interface PropertyChannelLink {
  channel: MessagingChannel;
  label: string;
  url: string;
}

/**
 * Deep-link «написать про объект» для публичной страницы. Входящий чат
 * привяжется к объекту: вебхуки парсят Telegram `start=p_<id>` и Messenger
 * `ref=p_<id>`. WhatsApp без ref — предзаполняем текст (контекст для агента).
 * Возвращает только подключённые каналы (порядок — как в инбоксе).
 */
export async function getPropertyMessagingLinks(
  organizationId: string,
  propertyId: string,
  prefillText?: string,
): Promise<PropertyChannelLink[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("messaging_connections")
    .select("channel, bot_username, page_id, phone_display")
    .eq("organization_id", organizationId)
    .eq("status", "connected");

  const byChannel = new Map((data ?? []).map((row) => [row.channel, row]));
  const links: PropertyChannelLink[] = [];

  for (const channel of MESSAGING_CHANNELS) {
    const row = byChannel.get(channel);
    if (!row) {
      continue;
    }
    if (channel === "telegram" && row.bot_username) {
      links.push({
        channel,
        label: CHANNEL_LABELS.telegram,
        url: `https://t.me/${row.bot_username}?start=p_${propertyId}`,
      });
    } else if (channel === "messenger" && row.page_id) {
      links.push({
        channel,
        label: CHANNEL_LABELS.messenger,
        url: `https://m.me/${row.page_id}?ref=p_${propertyId}`,
      });
    } else if (channel === "whatsapp_cloud" && row.phone_display) {
      const digits = row.phone_display.replace(/[^\d]/g, "");
      if (digits) {
        const query = prefillText
          ? `?text=${encodeURIComponent(prefillText)}`
          : "";
        links.push({
          channel,
          label: CHANNEL_LABELS.whatsapp_cloud,
          url: `https://wa.me/${digits}${query}`,
        });
      }
    }
  }

  return links;
}
