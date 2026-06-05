import { getWhatsAppConfig, type WhatsAppConfig } from "../config";
import type {
  MessageChannelAdapter,
  OutboundMediaMessage,
  OutboundTextMessage,
  SendResult,
} from "./types";

function graphBase(config: WhatsAppConfig): string {
  return `https://graph.facebook.com/${config.graphVersion}`;
}

interface WaSendResponse {
  messages?: { id: string }[];
  error?: { message?: string };
}

/** POST в Cloud API messages endpoint. */
async function waSend(
  config: WhatsAppConfig,
  payload: Record<string, unknown>,
): Promise<SendResult> {
  try {
    const response = await fetch(
      `${graphBase(config)}/${config.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
      },
    );
    const json = (await response.json()) as WaSendResponse;
    if (!response.ok || !json.messages?.[0]) {
      return {
        ok: false,
        error: json.error?.message ?? "WhatsApp send failed.",
      };
    }
    return { ok: true, externalMessageId: json.messages[0].id };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "WhatsApp request failed.",
    };
  }
}

/** Данные номера (display_phone_number, verified_name) для карточки. */
export async function whatsappGetPhoneInfo(
  config: WhatsAppConfig,
): Promise<{ displayPhone: string | null; verifiedName: string | null }> {
  try {
    const response = await fetch(
      `${graphBase(config)}/${config.phoneNumberId}?fields=display_phone_number,verified_name`,
      { headers: { Authorization: `Bearer ${config.accessToken}` } },
    );
    if (!response.ok) {
      return { displayPhone: null, verifiedName: null };
    }
    const json = (await response.json()) as {
      display_phone_number?: string;
      verified_name?: string;
    };
    return {
      displayPhone: json.display_phone_number ?? null,
      verifiedName: json.verified_name ?? null,
    };
  } catch {
    return { displayPhone: null, verifiedName: null };
  }
}

/** Подписывает приложение на вебхуки WABA (best-effort). */
export async function whatsappSubscribeApp(
  config: WhatsAppConfig,
): Promise<boolean> {
  if (!config.wabaId) {
    return false;
  }
  try {
    const response = await fetch(
      `${graphBase(config)}/${config.wabaId}/subscribed_apps`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${config.accessToken}` },
      },
    );
    return response.ok;
  } catch {
    return false;
  }
}

/** Резолвит ссылку и MIME входящего медиа по media_id. */
export async function whatsappGetMedia(
  config: WhatsAppConfig,
  mediaId: string,
): Promise<{ url: string; mimeType: string } | null> {
  try {
    const response = await fetch(`${graphBase(config)}/${mediaId}`, {
      headers: { Authorization: `Bearer ${config.accessToken}` },
    });
    if (!response.ok) {
      return null;
    }
    const json = (await response.json()) as { url?: string; mime_type?: string };
    if (!json.url) {
      return null;
    }
    return { url: json.url, mimeType: json.mime_type ?? "application/octet-stream" };
  } catch {
    return null;
  }
}

/** Скачивает байты медиа (требует Authorization). */
export async function whatsappDownloadMedia(
  config: WhatsAppConfig,
  url: string,
): Promise<ArrayBuffer | null> {
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${config.accessToken}` },
    });
    if (!response.ok) {
      return null;
    }
    return await response.arrayBuffer();
  } catch {
    return null;
  }
}

export interface WhatsAppTemplateSummary {
  name: string;
  language: string;
  category: string;
}

/**
 * Одобренные шаблоны WABA без переменных (Management API). Фильтруем
 * шаблоны с `{{n}}` — отправка by-name идёт без параметров, иначе Meta
 * отклонит. Для повторного контакта вне 24ч-окна.
 */
export async function whatsappListTemplates(
  config: WhatsAppConfig,
): Promise<WhatsAppTemplateSummary[]> {
  if (!config.wabaId) {
    return [];
  }
  try {
    const response = await fetch(
      `${graphBase(config)}/${config.wabaId}/message_templates?fields=name,status,language,category,components&limit=200`,
      { headers: { Authorization: `Bearer ${config.accessToken}` } },
    );
    if (!response.ok) {
      return [];
    }
    const json = (await response.json()) as {
      data?: {
        name: string;
        status: string;
        language: string;
        category?: string;
        components?: { type: string; text?: string }[];
      }[];
    };
    const seen = new Set<string>();
    const templates: WhatsAppTemplateSummary[] = [];
    for (const tpl of json.data ?? []) {
      if (tpl.status !== "APPROVED") {
        continue;
      }
      const hasVariables = (tpl.components ?? []).some((component) =>
        (component.text ?? "").includes("{{"),
      );
      if (hasVariables) {
        continue;
      }
      const key = `${tpl.name}:${tpl.language}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      templates.push({
        name: tpl.name,
        language: tpl.language,
        category: tpl.category ?? "",
      });
    }
    return templates;
  } catch {
    return [];
  }
}

/**
 * Отправка одобренного шаблона (вне 24-часового окна). `bodyParams` —
 * значения для переменных тела {{1}}, {{2}}… в порядке следования; пусто —
 * шаблон без переменных.
 */
export async function whatsappSendTemplate(
  to: string,
  templateName: string,
  languageCode: string,
  bodyParams: string[] = [],
): Promise<SendResult> {
  const config = getWhatsAppConfig();
  if (!config) {
    return { ok: false, error: "WhatsApp is not configured." };
  }
  const template: Record<string, unknown> = {
    name: templateName,
    language: { code: languageCode },
  };
  if (bodyParams.length > 0) {
    template.components = [
      {
        type: "body",
        parameters: bodyParams.map((text) => ({ type: "text", text })),
      },
    ];
  }
  return waSend(config, { to, type: "template", template });
}

/** Адаптер WhatsApp Cloud API (свободный текст в 24ч-окне, иначе шаблон). */
export function whatsappAdapter(): MessageChannelAdapter {
  return {
    channel: "whatsapp_cloud",
    async sendText(
      _connection,
      message: OutboundTextMessage,
    ): Promise<SendResult> {
      const config = getWhatsAppConfig();
      if (!config) {
        return { ok: false, error: "WhatsApp is not configured." };
      }
      return waSend(config, {
        to: message.to,
        type: "text",
        text: { body: message.text },
      });
    },
    async sendMedia(
      _connection,
      message: OutboundMediaMessage,
    ): Promise<SendResult> {
      const config = getWhatsAppConfig();
      if (!config) {
        return { ok: false, error: "WhatsApp is not configured." };
      }
      const type = message.kind === "image" ? "image" : "document";
      const media =
        message.kind === "image"
          ? { link: message.mediaUrl, ...(message.caption ? { caption: message.caption } : {}) }
          : {
              link: message.mediaUrl,
              ...(message.fileName ? { filename: message.fileName } : {}),
              ...(message.caption ? { caption: message.caption } : {}),
            };
      return waSend(config, { to: message.to, type, [type]: media });
    },
  };
}
