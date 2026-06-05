import { createAdminClient, createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/server/auth";
import { resolveUserNames } from "@/server/user-directory";

import type {
  AttachmentType,
  ChatConversation,
  ConversationType,
  MessageType,
} from "./types";

const ATTACHMENTS_BUCKET = "chat-attachments";
const SIGNED_URL_TTL = 60 * 60;

function notNull(value: string | null): value is string {
  return value !== null;
}

// ---- Список диалогов ------------------------------------------

export interface ConversationListItem {
  id: string;
  title: string;
  type: ConversationType;
  lastMessageAt: string | null;
  /** Короткое превью последнего сообщения (для списков/превью). */
  lastMessage: string | null;
  hasUnread: boolean;
}

/** Диалоги текущего пользователя (RLS отдаёт только те, где он участник). */
export async function listMyConversations(): Promise<ConversationListItem[]> {
  const user = await getCurrentUser();
  if (!user) {
    return [];
  }

  const supabase = createClient();
  const { data: conversations } = await supabase
    .from("chat_conversations")
    .select("*")
    .order("last_message_at", { ascending: false, nullsFirst: false });
  const rows = conversations ?? [];
  if (rows.length === 0) {
    return [];
  }

  const ids = rows.map((row) => row.id);
  const [participantsResult, readsResult] = await Promise.all([
    supabase
      .from("chat_participants")
      .select("conversation_id, user_id")
      .in("conversation_id", ids),
    supabase
      .from("message_reads")
      .select("conversation_id, last_read_at")
      .in("conversation_id", ids),
  ]);
  const participants = participantsResult.data ?? [];
  const reads = readsResult.data ?? [];

  // Превью последнего сообщения каждого диалога (по 1 запросу на диалог —
  // их у пользователя немного; параллельно).
  const previewEntries = await Promise.all(
    rows.map(async (conversation) => {
      const { data } = await supabase
        .from("chat_messages")
        .select("message, message_type")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      let preview: string | null = null;
      if (data) {
        const raw =
          data.message_type === "file" ? "📎 Attachment" : data.message ?? "";
        preview = raw.trim().slice(0, 120) || null;
      }
      return [conversation.id, preview] as const;
    }),
  );
  const previews = new Map(previewEntries);

  const names = await resolveUserNames(
    participants
      .filter((participant) => participant.user_id !== user.id)
      .map((participant) => participant.user_id),
  );

  return rows.map((conversation) => {
    const otherNames = participants
      .filter(
        (participant) =>
          participant.conversation_id === conversation.id &&
          participant.user_id !== user.id,
      )
      .map((participant) => names.get(participant.user_id) ?? "Participant");
    const read = reads.find(
      (item) => item.conversation_id === conversation.id,
    );
    const hasUnread =
      conversation.last_message_at !== null &&
      (!read || conversation.last_message_at > read.last_read_at);

    return {
      id: conversation.id,
      title:
        conversation.title ??
        (otherNames.length > 0 ? otherNames.join(", ") : "Conversation"),
      type: conversation.type,
      lastMessageAt: conversation.last_message_at,
      lastMessage: previews.get(conversation.id) ?? null,
      hasUnread,
    };
  });
}

// ---- Диалог с сообщениями -------------------------------------

export interface ChatAttachmentView {
  id: string;
  fileName: string;
  fileType: AttachmentType;
  mimeType: string;
  fileSize: number;
  signedUrl: string | null;
}

export interface ChatMessageView {
  id: string;
  senderId: string | null;
  senderName: string;
  isMine: boolean;
  message: string;
  messageType: MessageType;
  createdAt: string;
  attachment: ChatAttachmentView | null;
}

export interface ConversationView {
  conversation: ChatConversation;
  title: string;
  messages: ChatMessageView[];
}

/**
 * Полный диалог с сообщениями. RLS возвращает диалог только участнику;
 * для вложений генерируются signed URL приватного bucket.
 */
export async function getConversationView(
  conversationId: string,
): Promise<ConversationView | null> {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const supabase = createClient();
  const { data: conversation } = await supabase
    .from("chat_conversations")
    .select("*")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conversation) {
    return null;
  }

  const [messagesResult, participantsResult, attachmentsResult] =
    await Promise.all([
      supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true }),
      supabase
        .from("chat_participants")
        .select("user_id")
        .eq("conversation_id", conversationId),
      supabase
        .from("chat_attachments")
        .select("*")
        .eq("conversation_id", conversationId),
    ]);
  const messages = messagesResult.data ?? [];
  const participants = participantsResult.data ?? [];
  const attachments = attachmentsResult.data ?? [];

  const names = await resolveUserNames([
    ...new Set([
      ...participants.map((participant) => participant.user_id),
      ...messages.map((message) => message.sender_id).filter(notNull),
    ]),
  ]);

  // Signed URL для вложений приватного bucket.
  const signedUrls = new Map<string, string>();
  if (attachments.length > 0) {
    const admin = createAdminClient();
    const { data: signed } = await admin.storage
      .from(ATTACHMENTS_BUCKET)
      .createSignedUrls(
        attachments.map((attachment) => attachment.file_url),
        SIGNED_URL_TTL,
      );
    for (const item of signed ?? []) {
      if (item.path && item.signedUrl) {
        signedUrls.set(item.path, item.signedUrl);
      }
    }
  }

  const messageViews: ChatMessageView[] = messages.map((message) => {
    const attachment =
      attachments.find((item) => item.message_id === message.id) ?? null;
    return {
      id: message.id,
      senderId: message.sender_id,
      senderName: message.sender_id
        ? (names.get(message.sender_id) ?? "Participant")
        : "System",
      isMine: message.sender_id === user.id,
      message: message.message,
      messageType: message.message_type,
      createdAt: message.created_at,
      attachment: attachment
        ? {
            id: attachment.id,
            fileName: attachment.file_name,
            fileType: attachment.file_type,
            mimeType: attachment.mime_type,
            fileSize: attachment.file_size,
            signedUrl: signedUrls.get(attachment.file_url) ?? null,
          }
        : null,
    };
  });

  const otherNames = participants
    .filter((participant) => participant.user_id !== user.id)
    .map((participant) => names.get(participant.user_id) ?? "Participant");

  return {
    conversation,
    title:
      conversation.title ??
      (otherNames.length > 0 ? otherNames.join(", ") : "Conversation"),
    messages: messageViews,
  };
}
