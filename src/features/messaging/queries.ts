import { createAdminClient } from "@/lib/supabase/server";

import { MESSAGING_CHANNELS, CHANNEL_HAS_SESSION_WINDOW } from "./channels";
import { isChannelConfigured } from "./config";
import type {
  MessagingChannel,
  MessagingConnectionStatus,
  MessagingDirection,
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
        .select("id, direction, body, created_at")
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
