"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
  connectMessenger,
  connectTelegram,
  connectWhatsApp,
  disconnectChannel,
} from "@/features/messaging/actions";
import { CHANNEL_LABELS } from "@/features/messaging/channels";
import type { ChannelConnectionView } from "@/features/messaging/queries";
import type {
  MessagingChannel,
  MessagingConnectionStatus,
} from "@/features/messaging/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/provider";

const STATUS_BADGE: Record<
  MessagingConnectionStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  connected: "default",
  disconnected: "secondary",
  pending: "outline",
  error: "destructive",
};

/**
 * Карточки каналов мессенджеров на странице Integrations (self-hosted:
 * креды — в env, подключение активирует вебхук). Сейчас интерактивен
 * Telegram; WhatsApp/Messenger показывают статус (их connect — в своих фазах).
 */
export function MessagingChannelsCard({
  connections,
}: {
  connections: ChannelConnectionView[];
}) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.messaging;
  const [pending, setPending] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  // Telegram и WhatsApp подключаются из UI (валидация env + вебхук/подписка).
  // Messenger — в своей фазе.
  const CONNECTORS: Partial<Record<MessagingChannel, () => Promise<{ ok: boolean; error?: string }>>> =
    {
      telegram: connectTelegram,
      whatsapp_cloud: connectWhatsApp,
      messenger: connectMessenger,
    };

  async function handleConnect(channel: MessagingChannel) {
    const connector = CONNECTORS[channel];
    if (!connector) {
      return;
    }
    setPending(channel);
    setMessage(null);
    const result = await connector();
    setPending(null);
    if (result.ok) {
      router.refresh();
    } else {
      setMessage(result.error ?? t.couldNotConnect);
    }
  }

  async function handleDisconnect(channel: MessagingChannel) {
    setPending(channel);
    await disconnectChannel(channel);
    setPending(null);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {connections.map((connection) => (
        <div
          key={connection.channel}
          className="space-y-2 rounded-lg border p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">
                {CHANNEL_LABELS[connection.channel]}
              </p>
              <p className="text-xs text-muted-foreground">
                {connection.configured
                  ? t.credsConfigured
                  : t.notConfigured}
                {connection.detail ? ` · ${connection.detail}` : ""}
              </p>
            </div>
            <Badge
              variant={
                connection.status ? STATUS_BADGE[connection.status] : "outline"
              }
            >
              {connection.status ?? t.notConnected}
            </Badge>
          </div>

          {connection.channel in CONNECTORS ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                disabled={
                  !connection.configured || pending === connection.channel
                }
                onClick={() => handleConnect(connection.channel)}
              >
                {connection.status === "connected" ? t.reconnect : t.connect}
              </Button>
              {connection.status === "connected" ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive"
                  disabled={pending === connection.channel}
                  onClick={() => handleDisconnect(connection.channel)}
                >
                  {t.disconnect}
                </Button>
              ) : null}
              {connection.channel === "telegram" &&
              connection.status === "connected" &&
              connection.detail ? (
                <span className="text-xs text-muted-foreground">
                  {t.deepLinkPrefix} t.me/{connection.detail.replace("@", "")}
                  ?start=p_&lt;propertyId&gt;
                </span>
              ) : null}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              {t.configureCredsHint}
            </p>
          )}
        </div>
      ))}
      {message ? (
        <p className="text-xs text-destructive" role="alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}
