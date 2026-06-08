import { Resend } from "resend";

import { getServerEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/server";

type Admin = ReturnType<typeof createAdminClient>;

interface EmailConfig {
  apiKey: string;
  fromEmail: string;
}

/** Конфигурация Resend из окружения; null — если не задана. */
function getEmailConfig(): EmailConfig | null {
  const env = getServerEnv();
  if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) {
    return null;
  }
  return { apiKey: env.RESEND_API_KEY, fromEmail: env.RESEND_FROM_EMAIL };
}

/** Секрет для проверки подписи вебхуков Resend. */
export function getResendWebhookSecret(): string | null {
  return getServerEnv().RESEND_WEBHOOK_SECRET ?? null;
}

export interface SendEmailParams {
  organizationId: string;
  notificationEventId: string | null;
  templateKey: string;
  toEmail: string;
  fromName: string;
  subject: string;
  html: string;
  text: string;
}

export interface SendEmailResult {
  ok: boolean;
  emailSendId: string | null;
  error: string | null;
}

/** Фиксирует попытку отправки письма в email_sends. */
async function recordSend(
  admin: Admin,
  params: SendEmailParams,
  fields: {
    status: "sent" | "failed";
    providerMessageId?: string | null;
    providerResponse: Record<string, string>;
    error?: string | null;
  },
): Promise<string | null> {
  const { data } = await admin
    .from("email_sends")
    .insert({
      organization_id: params.organizationId,
      notification_event_id: params.notificationEventId,
      template_key: params.templateKey,
      to_email: params.toEmail,
      subject: params.subject,
      status: fields.status,
      provider: "resend",
      provider_message_id: fields.providerMessageId ?? null,
      provider_response: fields.providerResponse,
      error: fields.error ?? null,
      sent_at: fields.status === "sent" ? new Date().toISOString() : null,
    })
    .select("id")
    .single();
  return data?.id ?? null;
}

/**
 * true, если адрес в списке подавления организации: жёсткий (постоянный)
 * bounce или жалоба на спам. Дублёт-проверку равенства делаем в JS, чтобы
 * подстановочные `_`/`%` в ilike не дали ложных совпадений.
 */
async function isEmailSuppressed(
  admin: Admin,
  organizationId: string,
  email: string,
): Promise<boolean> {
  const target = email.trim().toLowerCase();
  if (!target) return false;
  const pattern = target.replace(/([%_\\])/g, "\\$1");
  const [bounce, complaint] = await Promise.all([
    admin
      .from("email_bounces")
      .select("email, bounce_type")
      .eq("organization_id", organizationId)
      .ilike("email", pattern),
    admin
      .from("email_complaints")
      .select("email")
      .eq("organization_id", organizationId)
      .ilike("email", pattern),
  ]);
  for (const row of complaint.data ?? []) {
    if ((row.email ?? "").toLowerCase() === target) return true;
  }
  for (const row of bounce.data ?? []) {
    if ((row.email ?? "").toLowerCase() !== target) continue;
    const type = (row.bounce_type ?? "").toLowerCase();
    if (!(type.includes("soft") || type.includes("transient"))) return true;
  }
  return false;
}

/**
 * Отправляет письмо через Resend и фиксирует результат в email_sends.
 * Если Resend не настроен — попытка логируется со статусом failed,
 * основной поток приложения при этом не прерывается.
 */
export async function sendEmail(
  params: SendEmailParams,
): Promise<SendEmailResult> {
  const admin = createAdminClient();
  const config = getEmailConfig();

  if (!config) {
    const id = await recordSend(admin, params, {
      status: "failed",
      providerResponse: {},
      error: "Resend is not configured.",
    });
    return { ok: false, emailSendId: id, error: "Resend is not configured." };
  }

  // Не шлём на адреса с постоянным bounce / жалобой на спам — это бьёт по
  // репутации отправителя и всё равно не доставится.
  if (await isEmailSuppressed(admin, params.organizationId, params.toEmail)) {
    const id = await recordSend(admin, params, {
      status: "failed",
      providerResponse: { suppressed: "true" },
      error: "Recipient suppressed (hard bounce or spam complaint).",
    });
    return {
      ok: false,
      emailSendId: id,
      error: "Recipient suppressed (hard bounce or spam complaint).",
    };
  }

  const fromName = params.fromName.replace(/[<>"]/g, "").trim() || "Notifications";

  try {
    const resend = new Resend(config.apiKey);
    const { data, error } = await resend.emails.send({
      from: `${fromName} <${config.fromEmail}>`,
      to: params.toEmail,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });
    if (error || !data?.id) {
      const message = error?.message ?? "Resend did not return a message id.";
      const id = await recordSend(admin, params, {
        status: "failed",
        providerResponse: { error: message },
        error: message,
      });
      return { ok: false, emailSendId: id, error: message };
    }
    const id = await recordSend(admin, params, {
      status: "sent",
      providerMessageId: data.id,
      providerResponse: { id: data.id },
    });
    return { ok: true, emailSendId: id, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Email send failed.";
    const id = await recordSend(admin, params, {
      status: "failed",
      providerResponse: { error: message },
      error: message,
    });
    return { ok: false, emailSendId: id, error: message };
  }
}
