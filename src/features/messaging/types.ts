import type { Enums, Tables } from "@/types/database";

export type MessagingChannel = Enums<"messaging_channel">;
export type MessagingConnectionStatus = Enums<"messaging_connection_status">;
export type MessagingDirection = Enums<"messaging_direction">;
export type MessagingMessageStatus = Enums<"messaging_message_status">;

export type MessagingConnection = Tables<"messaging_connections">;
export type ContactChannelIdentity = Tables<"contact_channel_identities">;
export type MessagingConversation = Tables<"messaging_conversations">;
export type MessagingMessage = Tables<"messaging_messages">;
export type MessagingAttachment = Tables<"messaging_attachments">;
