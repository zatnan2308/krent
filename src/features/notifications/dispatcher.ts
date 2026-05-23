import { createAdminClient } from "@/lib/supabase/server";

import { sendEmail } from "./email";
import { htmlToText, renderHtml, renderText, wrapEmailHtml } from "./render";

type Admin = ReturnType<typeof createAdminClient>;

export interface NotificationRecipient {
  email: string;
  name?: string | null;
  userId?: string | null;
}

export interface CreateNotificationEventInput {
  organizationId: string;
  eventType: string;
  entityType?: string | null;
  entityId?: string | null;
  recipients: NotificationRecipient[];
  variables: Record<string, string>;
}

interface EventRow {
  id: string;
  organization_id: string;
  event_type: string;
}

/** Первое слово имени получателя — для переменной {{first_name}}. */
function firstNameOf(name: string | null | undefined): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) {
    return "there";
  }
  return trimmed.split(/\s+/)[0] ?? "there";
}

/** Резолвит email и имя пользователя платформы (auth.users). */
export async function resolveUserRecipient(
  userId: string,
): Promise<{ email: string; name: string | null } | null> {
  try {
    const admin = createAdminClient();
    const { data } = await admin.auth.admin.getUserById(userId);
    const user = data.user;
    if (!user || !user.email) {
      return null;
    }
    const meta = user.user_metadata ?? {};
    const name =
      (typeof meta.full_name === "string" && meta.full_name.trim()) ||
      (typeof meta.name === "string" && meta.name.trim()) ||
      null;
    return { email: user.email, name };
  } catch {
    return null;
  }
}

/** Эффективный email-шаблон: переопределение организации либо системный. */
async function resolveEmailTemplate(
  admin: Admin,
  organizationId: string,
  key: string,
) {
  const { data: orgTemplate } = await admin
    .from("email_templates")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("key", key)
    .maybeSingle();
  if (orgTemplate) {
    return orgTemplate;
  }
  const { data: systemTemplate } = await admin
    .from("email_templates")
    .select("*")
    .is("organization_id", null)
    .eq("key", key)
    .maybeSingle();
  return systemTemplate;
}

/** Завершает событие: статус и время обработки. */
async function finishEvent(
  admin: Admin,
  eventId: string,
  status: "processed" | "failed",
  error: string | null,
): Promise<void> {
  await admin
    .from("notification_events")
    .update({ status, error, processed_at: new Date().toISOString() })
    .eq("id", eventId);
}

/** Пишет строку доставки в notification_logs. */
async function logDelivery(
  admin: Admin,
  event: EventRow,
  email: string,
  userId: string | null,
  status: "sent" | "skipped" | "failed",
  reason: string | null,
  emailSendId: string | null,
): Promise<void> {
  await admin.from("notification_logs").insert({
    organization_id: event.organization_id,
    notification_event_id: event.id,
    event_type: event.event_type,
    recipient_email: email,
    recipient_user_id: userId,
    status,
    reason,
    email_send_id: emailSendId,
  });
}

/**
 * Создаёт событие уведомления и сразу запускает его обработку.
 * Получатели и переменные шаблона передаёт вызывающий код — он же
 * резолвит организацию, поэтому письма не уходят без проверки
 * принадлежности организации.
 */
export async function createNotificationEvent(
  input: CreateNotificationEventInput,
): Promise<void> {
  if (input.recipients.length === 0) {
    return;
  }
  const admin = createAdminClient();
  const { data: event } = await admin
    .from("notification_events")
    .insert({
      organization_id: input.organizationId,
      event_type: input.eventType,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      payload: {
        recipients: input.recipients.map((recipient) => ({
          email: recipient.email,
          name: recipient.name ?? null,
          userId: recipient.userId ?? null,
        })),
        variables: input.variables,
      },
    })
    .select("id")
    .single();
  if (!event) {
    return;
  }
  await processNotificationEvent(event.id);
}

/**
 * Обрабатывает событие уведомления: подбирает маршрутизацию и шаблон,
 * проверяет notification_preferences (кроме транзакционных писем),
 * рендерит и отправляет письмо каждому получателю, ведёт логи.
 */
export async function processNotificationEvent(
  eventId: string,
): Promise<void> {
  const admin = createAdminClient();
  const { data: event } = await admin
    .from("notification_events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle();
  if (!event || event.status === "processed") {
    return;
  }

  await admin
    .from("notification_events")
    .update({ status: "processing" })
    .eq("id", eventId);

  try {
    const payload = (event.payload ?? {}) as Record<string, unknown>;
    const rawRecipients = Array.isArray(payload.recipients)
      ? payload.recipients
      : [];
    const recipients = rawRecipients
      .map((item) => {
        const row = (item ?? {}) as Record<string, unknown>;
        return {
          email: typeof row.email === "string" ? row.email : "",
          name: typeof row.name === "string" ? row.name : null,
          userId: typeof row.userId === "string" ? row.userId : null,
        };
      })
      .filter((recipient) => recipient.email !== "");

    const baseVariables: Record<string, string> = {};
    if (payload.variables && typeof payload.variables === "object") {
      for (const [key, value] of Object.entries(
        payload.variables as Record<string, unknown>,
      )) {
        baseVariables[key] = typeof value === "string" ? value : String(value ?? "");
      }
    }

    // Маршрутизация события.
    const { data: routing } = await admin
      .from("notification_templates")
      .select("*")
      .eq("key", event.event_type)
      .maybeSingle();
    if (!routing || !routing.is_active) {
      await finishEvent(
        admin,
        eventId,
        "processed",
        routing ? "Event type is inactive." : "Unknown event type.",
      );
      return;
    }

    // Контент письма.
    const emailTemplate = await resolveEmailTemplate(
      admin,
      event.organization_id,
      event.event_type,
    );
    if (!emailTemplate || !emailTemplate.is_active) {
      await finishEvent(admin, eventId, "processed", "No active email template.");
      return;
    }

    const { data: org } = await admin
      .from("organizations")
      .select("name")
      .eq("id", event.organization_id)
      .maybeSingle();
    const companyName = org?.name ?? "";

    // Настройка уровня организации (только для нетранзакционных писем).
    let orgEnabled = true;
    if (!routing.is_transactional) {
      const { data: orgPref } = await admin
        .from("notification_preferences")
        .select("enabled")
        .eq("organization_id", event.organization_id)
        .eq("event_type", event.event_type)
        .is("user_id", null)
        .maybeSingle();
      orgEnabled = orgPref ? orgPref.enabled : true;
    }

    for (const recipient of recipients) {
      if (!routing.is_transactional) {
        if (!orgEnabled) {
          await logDelivery(
            admin,
            event,
            recipient.email,
            recipient.userId,
            "skipped",
            "Disabled for the organization.",
            null,
          );
          continue;
        }
        if (recipient.userId) {
          const { data: userPref } = await admin
            .from("notification_preferences")
            .select("enabled")
            .eq("organization_id", event.organization_id)
            .eq("user_id", recipient.userId)
            .eq("event_type", event.event_type)
            .maybeSingle();
          if (userPref && !userPref.enabled) {
            await logDelivery(
              admin,
              event,
              recipient.email,
              recipient.userId,
              "skipped",
              "Disabled by the recipient.",
              null,
            );
            continue;
          }
        }
      }

      const variables: Record<string, string> = {
        ...baseVariables,
        company_name: baseVariables.company_name || companyName,
        first_name: firstNameOf(recipient.name),
      };
      const subject = renderText(emailTemplate.subject, variables);
      const content = renderHtml(emailTemplate.body_html, variables);
      const html = wrapEmailHtml(content, variables.company_name ?? companyName);
      const text = emailTemplate.body_text
        ? renderText(emailTemplate.body_text, variables)
        : htmlToText(content);

      const result = await sendEmail({
        organizationId: event.organization_id,
        notificationEventId: event.id,
        templateKey: event.event_type,
        toEmail: recipient.email,
        fromName: variables.company_name || "Notifications",
        subject,
        html,
        text,
      });
      await logDelivery(
        admin,
        event,
        recipient.email,
        recipient.userId,
        result.ok ? "sent" : "failed",
        result.error,
        result.emailSendId,
      );
    }

    await finishEvent(admin, eventId, "processed", null);
  } catch (error) {
    await finishEvent(
      admin,
      eventId,
      "failed",
      error instanceof Error ? error.message : "Processing failed.",
    );
  }
}
