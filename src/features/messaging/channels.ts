import type { MessagingChannel } from "./types";

/** Все каналы мессенджеров (порядок — как в UI-фильтре инбокса). */
export const MESSAGING_CHANNELS: MessagingChannel[] = [
  "whatsapp_cloud",
  "telegram",
  "messenger",
];

/** Человекочитаемые названия каналов. */
export const CHANNEL_LABELS: Record<MessagingChannel, string> = {
  whatsapp_cloud: "WhatsApp",
  telegram: "Telegram",
  messenger: "Messenger",
};

/**
 * Есть ли у канала «окно бесплатных сообщений» (24ч после входящего):
 *  - WhatsApp / Messenger — да (вне окна нужен шаблон / message tag);
 *  - Telegram — нет (ответы бесплатны, как только пользователь начал бота).
 */
export const CHANNEL_HAS_SESSION_WINDOW: Record<MessagingChannel, boolean> = {
  whatsapp_cloud: true,
  telegram: false,
  messenger: true,
};
