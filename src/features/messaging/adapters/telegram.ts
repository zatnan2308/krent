import { getTelegramConfig } from "../config";
import type {
  MessageChannelAdapter,
  OutboundMediaMessage,
  OutboundTextMessage,
  SendResult,
} from "./types";

const TELEGRAM_API = "https://api.telegram.org";

interface TelegramResponse<T = unknown> {
  ok: boolean;
  result?: T;
  description?: string;
}

interface TelegramMessageResult {
  message_id: number;
}

interface TelegramBotInfo {
  id: number;
  is_bot: boolean;
  first_name: string;
  username: string;
}

/** Низкоуровневый вызов Bot API. */
async function telegramCall<T>(
  token: string,
  method: string,
  payload: Record<string, unknown>,
): Promise<TelegramResponse<T>> {
  try {
    const response = await fetch(`${TELEGRAM_API}/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return (await response.json()) as TelegramResponse<T>;
  } catch (error) {
    return {
      ok: false,
      description:
        error instanceof Error ? error.message : "Telegram request failed.",
    };
  }
}

/** Проверяет токен и возвращает данные бота (getMe). */
export async function telegramGetMe(
  token: string,
): Promise<{ ok: true; username: string } | { ok: false; error: string }> {
  const result = await telegramCall<TelegramBotInfo>(token, "getMe", {});
  if (!result.ok || !result.result) {
    return { ok: false, error: result.description ?? "Invalid bot token." };
  }
  return { ok: true, username: result.result.username };
}

/** Регистрирует вебхук бота с секрет-токеном (проверяется на входящих). */
export async function telegramSetWebhook(
  token: string,
  url: string,
  secret: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const payload: Record<string, unknown> = {
    url,
    allowed_updates: ["message"],
  };
  if (secret) {
    payload.secret_token = secret;
  }
  const result = await telegramCall<boolean>(token, "setWebhook", payload);
  return result.ok
    ? { ok: true }
    : { ok: false, error: result.description ?? "setWebhook failed." };
}

/** Скачивает file_path для входящего медиа (getFile). */
export async function telegramGetFilePath(
  token: string,
  fileId: string,
): Promise<string | null> {
  const result = await telegramCall<{ file_path?: string }>(token, "getFile", {
    file_id: fileId,
  });
  return result.ok ? (result.result?.file_path ?? null) : null;
}

/** Прямой URL для скачивания файла Telegram. */
export function telegramFileUrl(token: string, filePath: string): string {
  return `${TELEGRAM_API}/file/bot${token}/${filePath}`;
}

/** Адаптер отправки в Telegram (бесплатно, как только юзер начал бота). */
export function telegramAdapter(): MessageChannelAdapter {
  return {
    channel: "telegram",
    async sendText(
      _connection,
      message: OutboundTextMessage,
    ): Promise<SendResult> {
      const config = getTelegramConfig();
      if (!config) {
        return { ok: false, error: "Telegram is not configured." };
      }
      const result = await telegramCall<TelegramMessageResult>(
        config.botToken,
        "sendMessage",
        { chat_id: message.to, text: message.text },
      );
      if (!result.ok || !result.result) {
        return { ok: false, error: result.description ?? "sendMessage failed." };
      }
      return { ok: true, externalMessageId: String(result.result.message_id) };
    },
    async sendMedia(
      _connection,
      message: OutboundMediaMessage,
    ): Promise<SendResult> {
      const config = getTelegramConfig();
      if (!config) {
        return { ok: false, error: "Telegram is not configured." };
      }
      const method = message.kind === "image" ? "sendPhoto" : "sendDocument";
      const field = message.kind === "image" ? "photo" : "document";
      const result = await telegramCall<TelegramMessageResult>(
        config.botToken,
        method,
        {
          chat_id: message.to,
          [field]: message.mediaUrl,
          ...(message.caption ? { caption: message.caption } : {}),
        },
      );
      if (!result.ok || !result.result) {
        return { ok: false, error: result.description ?? `${method} failed.` };
      }
      return { ok: true, externalMessageId: String(result.result.message_id) };
    },
  };
}
