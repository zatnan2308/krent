import { getMessengerConfig, type MessengerConfig } from "../config";
import type {
  MessageChannelAdapter,
  OutboundMediaMessage,
  OutboundTextMessage,
  SendResult,
} from "./types";

function graphBase(config: MessengerConfig): string {
  return `https://graph.facebook.com/${config.graphVersion}`;
}

interface FbSendResponse {
  message_id?: string;
  error?: { message?: string };
}

/** POST в Page messages endpoint. */
async function fbSend(
  config: MessengerConfig,
  message: Record<string, unknown>,
  recipientId: string,
): Promise<SendResult> {
  try {
    const response = await fetch(
      `${graphBase(config)}/${config.pageId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.pageAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipient: { id: recipientId },
          messaging_type: "RESPONSE",
          message,
        }),
      },
    );
    const json = (await response.json()) as FbSendResponse;
    if (!response.ok || !json.message_id) {
      return {
        ok: false,
        error: json.error?.message ?? "Messenger send failed.",
      };
    }
    return { ok: true, externalMessageId: json.message_id };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Messenger request failed.",
    };
  }
}

/** Имя страницы для карточки. */
export async function messengerGetPageInfo(
  config: MessengerConfig,
): Promise<{ name: string | null }> {
  try {
    const response = await fetch(
      `${graphBase(config)}/${config.pageId}?fields=name`,
      { headers: { Authorization: `Bearer ${config.pageAccessToken}` } },
    );
    if (!response.ok) {
      return { name: null };
    }
    const json = (await response.json()) as { name?: string };
    return { name: json.name ?? null };
  } catch {
    return { name: null };
  }
}

/** Имя пользователя по PSID (best-effort, для нового контакта). */
export async function messengerGetUserName(
  config: MessengerConfig,
  psid: string,
): Promise<string | null> {
  try {
    const response = await fetch(
      `${graphBase(config)}/${psid}?fields=name`,
      { headers: { Authorization: `Bearer ${config.pageAccessToken}` } },
    );
    if (!response.ok) {
      return null;
    }
    const json = (await response.json()) as { name?: string };
    return json.name ?? null;
  } catch {
    return null;
  }
}

/** Подписывает приложение на вебхуки страницы. */
export async function messengerSubscribeApp(
  config: MessengerConfig,
): Promise<boolean> {
  try {
    const response = await fetch(
      `${graphBase(config)}/${config.pageId}/subscribed_apps?subscribed_fields=messages,messaging_postbacks`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${config.pageAccessToken}` },
      },
    );
    return response.ok;
  } catch {
    return false;
  }
}

/** Адаптер Facebook Messenger (свободный текст в 24ч-окне, иначе message tag). */
export function messengerAdapter(): MessageChannelAdapter {
  return {
    channel: "messenger",
    async sendText(
      _connection,
      message: OutboundTextMessage,
    ): Promise<SendResult> {
      const config = getMessengerConfig();
      if (!config) {
        return { ok: false, error: "Messenger is not configured." };
      }
      return fbSend(config, { text: message.text }, message.to);
    },
    async sendMedia(
      _connection,
      message: OutboundMediaMessage,
    ): Promise<SendResult> {
      const config = getMessengerConfig();
      if (!config) {
        return { ok: false, error: "Messenger is not configured." };
      }
      const type = message.kind === "image" ? "image" : "file";
      return fbSend(
        config,
        {
          attachment: {
            type,
            payload: { url: message.mediaUrl, is_reusable: true },
          },
        },
        message.to,
      );
    },
  };
}
