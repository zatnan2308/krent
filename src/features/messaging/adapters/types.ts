import type { MessagingChannel, MessagingConnection } from "../types";

/** Исходящее текстовое сообщение. */
export interface OutboundTextMessage {
  /** Идентификатор получателя в канале: телефон (WA) / chat_id (TG) / PSID (FB). */
  to: string;
  text: string;
}

/** Исходящее медиа-сообщение (изображение или документ). */
export interface OutboundMediaMessage {
  to: string;
  /** Публичный/подписанный URL файла, который канал скачает. */
  mediaUrl: string;
  kind: "image" | "document";
  caption?: string;
  fileName?: string;
}

export interface SendResult {
  ok: boolean;
  externalMessageId?: string;
  error?: string;
}

/**
 * Единый интерфейс отправки в канал (зеркалит IntegrationAdapter из
 * features/integrations). Один адаптер на канал: WhatsAppCloudAdapter,
 * TelegramAdapter, MessengerAdapter — все подключаются через registry.
 * Прямые API провайдеров, без BSP.
 */
export interface MessageChannelAdapter {
  readonly channel: MessagingChannel;
  sendText(
    connection: MessagingConnection,
    message: OutboundTextMessage,
  ): Promise<SendResult>;
  sendMedia(
    connection: MessagingConnection,
    message: OutboundMediaMessage,
  ): Promise<SendResult>;
}
