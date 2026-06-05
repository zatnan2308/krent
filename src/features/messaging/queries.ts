import { createAdminClient } from "@/lib/supabase/server";

import { MESSAGING_CHANNELS } from "./channels";
import { isChannelConfigured } from "./config";
import type { MessagingChannel, MessagingConnectionStatus } from "./types";

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
