import { createHmac, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { messengerGetUserName } from "@/features/messaging/adapters/messenger";
import { getMessengerConfig } from "@/features/messaging/config";
import {
  attachInboundMedia,
  ensureContactIdentity,
  ensureConversation,
  recordInboundMessage,
  resolveConnectionByRouting,
} from "@/features/messaging/store";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const OK = new NextResponse("OK", { status: 200 });
const UUID = /^[0-9a-fA-F-]{36}$/;

interface FbAttachment {
  type: string;
  payload?: { url?: string };
}
interface FbMessaging {
  sender?: { id: string };
  message?: { mid?: string; text?: string; attachments?: FbAttachment[] };
  postback?: { referral?: { ref?: string } };
  referral?: { ref?: string };
}
interface FbEntry {
  id?: string;
  messaging?: FbMessaging[];
}
interface FbPayload {
  object?: string;
  entry?: FbEntry[];
}

function mimeForAttachment(type: string): string {
  if (type === "image") return "image/jpeg";
  if (type === "video") return "video/mp4";
  if (type === "audio") return "audio/mpeg";
  return "application/octet-stream";
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
    "sha256=" +
    createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** GET: верификация вебхука Meta. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const config = getMessengerConfig();
  if (
    url.searchParams.get("hub.mode") === "subscribe" &&
    config?.verifyToken &&
    url.searchParams.get("hub.verify_token") === config.verifyToken
  ) {
    return new NextResponse(url.searchParams.get("hub.challenge") ?? "", {
      status: 200,
    });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
  const config = getMessengerConfig();
  if (!config) {
    return OK;
  }
  const rawBody = await request.text();
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

  let payload: FbPayload;
  try {
    payload = JSON.parse(rawBody) as FbPayload;
  } catch {
    return OK;
  }
  if (payload.object !== "page") {
    return OK;
  }

  const admin = createAdminClient();

  for (const entry of payload.entry ?? []) {
    const pageId = entry.id;
    if (!pageId || !entry.messaging?.length) {
      continue;
    }
    const connection = await resolveConnectionByRouting(admin, "messenger", {
      pageId,
    });
    if (!connection) {
      continue;
    }
    const organizationId = connection.organization_id;

    for (const event of entry.messaging) {
      const psid = event.sender?.id;
      if (!psid) {
        continue;
      }
      const ref = event.referral?.ref ?? event.postback?.referral?.ref ?? null;

      // Deep-link m.me/<page>?ref=p_<id>/l_<id>.
      let leadId: string | null = null;
      let propertyId: string | null = null;
      let preferredContactId: string | null = null;
      if (ref?.startsWith("p_") && UUID.test(ref.slice(2))) {
        const { data: property } = await admin
          .from("properties")
          .select("id")
          .eq("organization_id", organizationId)
          .eq("id", ref.slice(2))
          .maybeSingle();
        propertyId = property?.id ?? null;
      } else if (ref?.startsWith("l_") && UUID.test(ref.slice(2))) {
        const { data: lead } = await admin
          .from("leads")
          .select("id, contact_id, property_id")
          .eq("organization_id", organizationId)
          .eq("id", ref.slice(2))
          .maybeSingle();
        if (lead) {
          leadId = lead.id;
          preferredContactId = lead.contact_id;
          propertyId = lead.property_id;
        }
      }

      const name = await messengerGetUserName(config, psid);
      const identity = await ensureContactIdentity(admin, {
        organizationId,
        channel: "messenger",
        externalId: psid,
        name,
        preferredContactId,
      });
      if (!identity) {
        continue;
      }
      const conversationId = await ensureConversation(admin, {
        organizationId,
        channel: "messenger",
        connectionId: connection.id,
        contactId: identity.contactId,
        identityId: identity.identityId,
        leadId,
        propertyId,
      });
      if (!conversationId) {
        continue;
      }

      const attachment = event.message?.attachments?.[0] ?? null;
      const body = event.message?.text ?? "";
      const externalMessageId = event.message?.mid ?? null;
      const recorded = await recordInboundMessage(admin, {
        organizationId,
        channel: "messenger",
        conversationId,
        externalMessageId,
        body,
      });
      if (!recorded || !recorded.isNew || !attachment?.payload?.url) {
        continue;
      }

      // Медиа: payload.url у Messenger — публичный CDN, тянем напрямую.
      try {
        const res = await fetch(attachment.payload.url);
        if (res.ok) {
          const data = await res.arrayBuffer();
          await attachInboundMedia(admin, {
            organizationId,
            conversationId,
            messageId: recorded.messageId,
            fileName: attachment.payload.url.split("/").pop()?.split("?")[0] ?? "attachment",
            mimeType: mimeForAttachment(attachment.type),
            data,
          });
        }
      } catch {
        // media best-effort
      }
    }
  }

  return OK;
}
