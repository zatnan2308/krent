"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
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
  const [pending, setPending] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  // Telegram и WhatsApp подключаются из UI (валидация env + вебхук/подписка).
  // Messenger — в своей фазе.
  const CONNECTORS: Partial<Record<MessagingChannel, () => Promise<{ ok: boolean; error?: string }>>> =
    {
      telegram: connectTelegram,
      whatsapp_cloud: connectWhatsApp,
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
      setMessage(result.error ?? "Could not connect.");
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
                  ? "Credentials configured in the environment."
                  : "Not configured — set the env vars (see SETUP.md)."}
                {connection.detail ? ` · ${connection.detail}` : ""}
              </p>
            </div>
            <Badge
              variant={
                connection.status ? STATUS_BADGE[connection.status] : "outline"
              }
            >
              {connection.status ?? "Not connected"}
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
                {connection.status === "connected" ? "Reconnect" : "Connect"}
              </Button>
              {connection.status === "connected" ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive"
                  disabled={pending === connection.channel}
                  onClick={() => handleDisconnect(connection.channel)}
                >
                  Disconnect
                </Button>
              ) : null}
              {connection.channel === "telegram" &&
              connection.status === "connected" &&
              connection.detail ? (
                <span className="text-xs text-muted-foreground">
                  Deep link: t.me/{connection.detail.replace("@", "")}
                  ?start=p_&lt;propertyId&gt;
                </span>
              ) : null}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Configure credentials in the environment; the channel is connected
              at handoff (see SETUP.md).
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
