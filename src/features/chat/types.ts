import type { Enums, Tables } from "@/types/database";

export type ChatConversation = Tables<"chat_conversations">;
export type ChatParticipant = Tables<"chat_participants">;
export type ChatMessage = Tables<"chat_messages">;
export type ChatAttachment = Tables<"chat_attachments">;
export type MessageRead = Tables<"message_reads">;

export type ConversationType = Enums<"conversation_type">;
export type MessageType = Enums<"message_type">;
export type AttachmentType = Enums<"attachment_type">;
