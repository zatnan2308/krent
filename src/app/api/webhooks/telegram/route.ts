import { NextResponse } from "next/server";

import {
  telegramFileUrl,
  telegramGetFilePath,
} from "@/features/messaging/adapters/telegram";
import { getTelegramConfig } from "@/features/messaging/config";
import {
  attachInboundMedia,
  ensureContactIdentity,
  ensureConversation,
  recordInboundMessage,
  resolveConnectionByRouting,
} from "@/features/messaging/store";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface TgChat {
  id: number;
  type: string;
}
interface TgUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
}
interface TgPhotoSize {
  file_id: string;
}
interface TgDocument {
  file_id: string;
  file_name?: string;
  mime_type?: string;
}
interface TgMessage {
  message_id: number;
  chat: TgChat;
  from?: TgUser;
  text?: string;
  caption?: string;
  photo?: TgPhotoSize[];
  document?: TgDocument;
}
interface TgUpdate {
  message?: TgMessage;
}

const OK = NextResponse.json({ ok: true });

/** Разбирает deep-link payload `/start <payload>`: p_<propertyId> / l_<leadId>. */
function parseStartPayload(text: string): {
  isStart: boolean;
  propertyToken: string | null;
  leadToken: string | null;
} {
  if (!text.startsWith("/start")) {
    return { isStart: false, propertyToken: null, leadToken: null };
  }
  const payload = text.replace(/^\/start\s*/, "").trim();
  if (payload.startsWith("p_")) {
    return { isStart: true, propertyToken: payload.slice(2), leadToken: null };
  }
  if (payload.startsWith("l_")) {
    return { isStart: true, propertyToken: null, leadToken: payload.slice(2) };
  }
  return { isStart: true, propertyToken: null, leadToken: null };
}

const UUID = /^[0-9a-fA-F-]{36}$/;

export async function POST(request: Request) {
  const config = getTelegramConfig();
  // Бот не настроен в этой копии — игнорируем (200, чтобы не было ретраев).
  if (!config) {
    return OK;
  }
  // Проверка секрет-токена (если задан) — что вебхук действительно от Telegram.
  if (config.webhookSecret) {
    const header = request.headers.get("x-telegram-bot-api-secret-token");
    if (header !== config.webhookSecret) {
      return new NextResponse("Forbidden", { status: 401 });
    }
  }

  let update: TgUpdate;
  try {
    update = (await request.json()) as TgUpdate;
  } catch {
    return OK;
  }
  const message = update.message;
  if (!message || !message.chat) {
    return OK;
  }

  const admin = createAdminClient();
  const connection = await resolveConnectionByRouting(admin, "telegram", {});
  if (!connection) {
    return OK;
  }
  const organizationId = connection.organization_id;
  const chatId = String(message.chat.id);
  const text = message.text ?? "";
  const { isStart, propertyToken, leadToken } = parseStartPayload(text);

  // Deep-link: привязка к объекту/лиду (и контакту лида).
  let leadId: string | null = null;
  let propertyId: string | null = null;
  let preferredContactId: string | null = null;
  if (propertyToken && UUID.test(propertyToken)) {
    const { data: property } = await admin
      .from("properties")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("id", propertyToken)
      .maybeSingle();
    propertyId = property?.id ?? null;
  }
  if (leadToken && UUID.test(leadToken)) {
    const { data: lead } = await admin
      .from("leads")
      .select("id, contact_id, property_id")
      .eq("organization_id", organizationId)
      .eq("id", leadToken)
      .maybeSingle();
    if (lead) {
      leadId = lead.id;
      preferredContactId = lead.contact_id;
      propertyId = propertyId ?? lead.property_id;
    }
  }

  const fullName = [message.from?.first_name, message.from?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  const identity = await ensureContactIdentity(admin, {
    organizationId,
    channel: "telegram",
    externalId: chatId,
    handle: message.from?.username ?? null,
    name: fullName || null,
    preferredContactId,
  });
  if (!identity) {
    return OK;
  }

  const conversationId = await ensureConversation(admin, {
    organizationId,
    channel: "telegram",
    connectionId: connection.id,
    contactId: identity.contactId,
    identityId: identity.identityId,
    leadId,
    propertyId,
  });
  if (!conversationId) {
    return OK;
  }

  const caption = message.caption ?? "";
  const hasMedia = Boolean(message.photo?.length || message.document);
  const body = isStart
    ? "Started the conversation"
    : message.text || caption || (hasMedia ? "" : "");

  const recorded = await recordInboundMessage(admin, {
    organizationId,
    channel: "telegram",
    conversationId,
    externalMessageId: String(message.message_id),
    body,
  });
  if (!recorded || !recorded.isNew) {
    return OK;
  }

  // Медиа: скачиваем у Telegram и кладём в приватный бакет (best-effort).
  if (hasMedia) {
    try {
      const fileId = message.document
        ? message.document.file_id
        : (message.photo?.[message.photo.length - 1]?.file_id ?? null);
      if (fileId) {
        const filePath = await telegramGetFilePath(config.botToken, fileId);
        if (filePath) {
          const res = await fetch(telegramFileUrl(config.botToken, filePath));
          if (res.ok) {
            const data = await res.arrayBuffer();
            const fileName = message.document
              ? (message.document.file_name ?? filePath.split("/").pop() ?? "file")
              : (filePath.split("/").pop() ?? "photo.jpg");
            const mimeType = message.document
              ? (message.document.mime_type ?? "application/octet-stream")
              : "image/jpeg";
            await attachInboundMedia(admin, {
              organizationId,
              conversationId,
              messageId: recorded.messageId,
              fileName,
              mimeType,
              data,
              externalMediaId: fileId,
            });
          }
        }
      }
    } catch {
      // медиа не критично — сообщение уже записано
    }
  }

  return OK;
}
