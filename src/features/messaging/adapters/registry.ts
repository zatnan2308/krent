import type { MessagingChannel } from "../types";
import type { MessageChannelAdapter } from "./types";

/**
 * Реестр адаптеров каналов (зеркалит getIntegrationAdapter).
 * Конкретные адаптеры подключаются в фазах своих каналов:
 *  - telegram   → ./telegram
 *  - whatsapp_cloud → ./whatsapp
 *  - messenger  → ./messenger
 */
export function getMessageAdapter(
  channel: MessagingChannel,
): MessageChannelAdapter {
  throw new Error(`Messaging adapter is not implemented yet: ${channel}`);
}
