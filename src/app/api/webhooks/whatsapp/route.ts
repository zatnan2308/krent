import { createHmac, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import {
  whatsappDownloadMedia,
  whatsappGetMedia,
} from "@/features/messaging/adapters/whatsapp";
import { getWhatsAppConfig } from "@/features/messaging/config";
import {
  attachInboundMedia,
  ensureContactIdentity,
  ensureConversation,
  recordInboundMessage,
  resolveConnectionByRouting,
  updateOutboundStatus,
} from "@/features/messaging/store";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const OK = new NextResponse("OK", { status: 200 });

interface WaMediaPart {
  id: string;
  caption?: string;
  filename?: string;
  mime_type?: string;
}
interface WaMessage {
  from: string;
  id: string;
  type: string;
  text?: { body: string };
  image?: WaMediaPart;
  document?: WaMediaPart;
}
interface WaContact {
  wa_id: string;
  profile?: { name?: string };
}
interface WaStatus {
  id: string;
  status: string;
  errors?: { code?: number; title?: string; message?: string }[];
}
interface WaChangeValue {
  metadata?: { phone_number_id?: string };
  contacts?: WaContact[];
  messages?: WaMessage[];
  statuses?: WaStatus[];
}
interface WaEntry {
  changes?: { value?: WaChangeValue }[];
}
interface WaPayload {
  object?: string;
  entry?: WaEntry[];
}

/** WhatsApp шлёт ровно эти значения статуса доставки исходящего. */
function mapWaStatus(value: string): WaDeliveryStatus | null {
  if (
    value === "sent" ||
    value === "delivered" ||
    value === "read" ||
    value === "failed"
  ) {
    return value;
  }
  return null;
}
type WaDeliveryStatus = "sent" | "delivered" | "read" | "failed";

/** GET: верификация вебхука Meta (hub.challenge). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const config = getWhatsAppConfig();
  if (
    mode === "subscribe" &&
    config?.verifyToken &&
    token === config.verifyToken
  ) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

function verifySignature(
  appSecret: string,
  rawBody: string,
  header: string | null,
): boolean {
  if (!header) {
    return false;
  }
  const expected =
    "sha256=" + createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const config = getWhatsAppConfig();
  if (!config) {
    return OK;
  }
  const rawBody = await request.text();
  // Проверка подписи Meta (X-Hub-Signature-256) по app secret покупателя.
  if (config.appSecret) {
    const ok = verifySignature(
      config.appSecret,
      rawBody,
      request.headers.get("x-hub-signature-256"),
    );
    if (!ok) {
      return new NextResponse("Invalid signature", { status: 401 });
    }
  }

  let payload: WaPayload;
  try {
    payload = JSON.parse(rawBody) as WaPayload;
  } catch {
    return OK;
  }
  if (payload.object !== "whatsapp_business_account") {
    return OK;
  }

  const admin = createAdminClient();

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;

      // Статусы доставки исходящих (sent/delivered/read/failed).
      for (const status of value?.statuses ?? []) {
        const mapped = mapWaStatus(status.status);
        if (!mapped) {
          continue;
        }
        await updateOutboundStatus(admin, {
          channel: "whatsapp_cloud",
          externalMessageId: status.id,
          status: mapped,
          errorMessage:
            status.errors?.[0]?.title ?? status.errors?.[0]?.message ?? null,
        });
      }

      const phoneNumberId = value?.metadata?.phone_number_id;
      const messages = value?.messages;
      if (!phoneNumberId || !messages?.length) {
        continue;
      }
      const connection = await resolveConnectionByRouting(
        admin,
        "whatsapp_cloud",
        { phoneNumberId },
      );
      if (!connection) {
        continue;
      }
      const organizationId = connection.organization_id;
      const nameByWaId = new Map(
        (value?.contacts ?? []).map((c) => [c.wa_id, c.profile?.name ?? null]),
      );

      for (const message of messages) {
        const from = message.from;
        if (!from) {
          continue;
        }
        const identity = await ensureContactIdentity(admin, {
          organizationId,
          channel: "whatsapp_cloud",
          externalId: from,
          phone: from,
          name: nameByWaId.get(from) ?? null,
        });
        if (!identity) {
          continue;
        }
        const conversationId = await ensureConversation(admin, {
          organizationId,
          channel: "whatsapp_cloud",
          connectionId: connection.id,
          contactId: identity.contactId,
          identityId: identity.identityId,
        });
        if (!conversationId) {
          continue;
        }

        const media = message.image ?? message.document ?? null;
        const body =
          message.text?.body ?? media?.caption ?? (media ? "" : "");
        const recorded = await recordInboundMessage(admin, {
          organizationId,
          channel: "whatsapp_cloud",
          conversationId,
          externalMessageId: message.id,
          body,
        });
        if (!recorded || !recorded.isNew || !media) {
          continue;
        }

        // Медиа: резолвим ссылку → скачиваем с токеном → приватный бакет.
        try {
          const resolved = await whatsappGetMedia(config, media.id);
          if (resolved) {
            const data = await whatsappDownloadMedia(config, resolved.url);
            if (data) {
              const fileName =
                media.filename ??
                (message.image ? "photo.jpg" : "document.bin");
              await attachInboundMedia(admin, {
                organizationId,
                conversationId,
                messageId: recorded.messageId,
                fileName,
                mimeType: resolved.mimeType,
                data,
                externalMediaId: media.id,
              });
            }
          }
        } catch {
          // медиа best-effort
        }
      }
    }
  }

  return OK;
}
