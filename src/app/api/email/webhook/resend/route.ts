import crypto from "node:crypto";

import { NextResponse } from "next/server";

import { getResendWebhookSecret } from "@/features/notifications/email";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Безопасное чтение строкового поля произвольного payload. */
function readString(value: unknown, key: string): string | null {
  if (value && typeof value === "object" && key in value) {
    const field = (value as Record<string, unknown>)[key];
    if (typeof field === "string") {
      return field;
    }
  }
  return null;
}

/** Извлекает email получателя из data.to. */
function readRecipient(data: unknown): string {
  if (data && typeof data === "object" && "to" in data) {
    const to = (data as Record<string, unknown>).to;
    if (Array.isArray(to) && typeof to[0] === "string") {
      return to[0];
    }
    if (typeof to === "string") {
      return to;
    }
  }
  return "unknown";
}

/** Сравнение строк за постоянное время. */
function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufferA, bufferB);
}

/**
 * Проверяет подпись вебхука по схеме Svix (её использует Resend).
 * Подписанный контент: "{svix-id}.{svix-timestamp}.{body}".
 */
function verifySvixSignature(
  secret: string,
  headers: { id: string | null; timestamp: string | null; signature: string | null },
  body: string,
): boolean {
  if (!headers.id || !headers.timestamp || !headers.signature) {
    return false;
  }
  const secretBytes = Buffer.from(
    secret.replace(/^whsec_/, ""),
    "base64",
  );
  const signedContent = `${headers.id}.${headers.timestamp}.${body}`;
  const expected = crypto
    .createHmac("sha256", secretBytes)
    .update(signedContent)
    .digest("base64");
  for (const part of headers.signature.split(" ")) {
    const [version, signature] = part.split(",");
    if (version === "v1" && signature && safeEqual(signature, expected)) {
      return true;
    }
  }
  return false;
}

/** Фиксирует отказ доставки или жалобу на спам. */
async function recordEmailEvent(
  type: "email.bounced" | "email.complained",
  data: unknown,
): Promise<void> {
  const admin = createAdminClient();
  const messageId = readString(data, "email_id");
  const recipient = readRecipient(data);

  let organizationId: string | null = null;
  let emailSendId: string | null = null;
  if (messageId) {
    const { data: send } = await admin
      .from("email_sends")
      .select("id, organization_id")
      .eq("provider_message_id", messageId)
      .maybeSingle();
    if (send) {
      emailSendId = send.id;
      organizationId = send.organization_id;
    }
  }

  if (type === "email.bounced") {
    await admin.from("email_bounces").insert({
      organization_id: organizationId,
      email_send_id: emailSendId,
      email: recipient || "unknown",
      bounce_type: readString(data, "bounce_type"),
      provider_message_id: messageId,
      payload: { type },
    });
  } else {
    await admin.from("email_complaints").insert({
      organization_id: organizationId,
      email_send_id: emailSendId,
      email: recipient || "unknown",
      provider_message_id: messageId,
      payload: { type },
    });
  }
}

/**
 * Вебхук Resend: отказы доставки (email.bounced) и жалобы на спам
 * (email.complained). Подпись проверяется по RESEND_WEBHOOK_SECRET,
 * если он задан; иначе уведомление логируется без проверки.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();

  const secret = getResendWebhookSecret();
  if (secret) {
    const verified = verifySvixSignature(
      secret,
      {
        id: request.headers.get("svix-id"),
        timestamp: request.headers.get("svix-timestamp"),
        signature: request.headers.get("svix-signature"),
      },
      rawBody,
    );
    if (!verified) {
      return new NextResponse("Invalid signature", { status: 400 });
    }
  }

  let payload: unknown = null;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    payload = null;
  }

  const type = readString(payload, "type");
  if (type === "email.bounced" || type === "email.complained") {
    const data =
      payload && typeof payload === "object" && "data" in payload
        ? (payload as Record<string, unknown>).data
        : null;
    try {
      await recordEmailEvent(type, data);
    } catch {
      // Сбой логирования не должен мешать ответу 200.
    }
  }

  return NextResponse.json({ received: true });
}
