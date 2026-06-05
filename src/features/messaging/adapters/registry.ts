import type { MessagingChannel } from "../types";
import { messengerAdapter } from "./messenger";
import { telegramAdapter } from "./telegram";
import type { MessageChannelAdapter } from "./types";
import { whatsappAdapter } from "./whatsapp";

/**
 * Реестр адаптеров каналов (зеркалит getIntegrationAdapter).
 * Конкретные адаптеры подключаются в фазах своих каналов:
 *  - telegram   → ./telegram  (готов)
 *  - whatsapp_cloud → ./whatsapp
 *  - messenger  → ./messenger
 */
export function getMessageAdapter(
  channel: MessagingChannel,
): MessageChannelAdapter {
  switch (channel) {
    case "telegram":
      return telegramAdapter();
    case "whatsapp_cloud":
      return whatsappAdapter();
    case "messenger":
      return messengerAdapter();
    default:
      throw new Error(`Messaging adapter is not implemented yet: ${channel}`);
  }
}
