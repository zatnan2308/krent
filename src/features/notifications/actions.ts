"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/server";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

import { TEMPLATE_VARIABLES } from "./constants";
import { resolveUserRecipient } from "./dispatcher";
import { sendEmail } from "./email";
import { htmlToText, renderHtml, renderText, wrapEmailHtml } from "./render";
import {
  notificationPreferenceSchema,
  saveEmailTemplateSchema,
  type ActionResult,
  type NotificationPreferenceInput,
  type SaveEmailTemplateInput,
} from "./schema";

/** Гард: активная организация + право email.manage. */
async function requireEmailAccess(): Promise<
  { ok: true; organizationId: string } | { ok: false; error: string }
> {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false, error: "No active organization." };
  }
  if (!hasPermission(context, "email.manage")) {
    return {
      ok: false,
      error: "You do not have permission to manage email.",
    };
  }
  return { ok: true, organizationId: context.organization.id };
}

/**
 * Сохраняет email-шаблон организации — переопределение системного.
 * При первом сохранении создаётся org-строка, далее обновляется.
 */
export async function saveEmailTemplate(
  input: SaveEmailTemplateInput,
): Promise<ActionResult> {
  const parsed = saveEmailTemplateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the template fields." };
  }
  const data = parsed.data;
  const access = await requireEmailAccess();
  if (!access.ok) {
    return access;
  }

  const admin = createAdminClient();
  const { data: system } = await admin
    .from("email_templates")
    .select("name")
    .is("organization_id", null)
    .eq("key", data.key)
    .maybeSingle();
  if (!system) {
    return { ok: false, error: "Unknown email template." };
  }

  const { data: existing } = await admin
    .from("email_templates")
    .select("id")
    .eq("organization_id", access.organizationId)
    .eq("key", data.key)
    .maybeSingle();

  if (existing) {
    const { error } = await admin
      .from("email_templates")
      .update({
        subject: data.subject,
        body_html: data.bodyHtml,
        is_active: data.isActive,
      })
      .eq("id", existing.id);
    if (error) {
      return { ok: false, error: "Could not save the template." };
    }
  } else {
    const { error } = await admin.from("email_templates").insert({
      organization_id: access.organizationId,
      key: data.key,
      name: system.name,
      subject: data.subject,
      body_html: data.bodyHtml,
      is_active: data.isActive,
    });
    if (error) {
      return { ok: false, error: "Could not save the template." };
    }
  }

  revalidatePath("/dashboard/email");
  revalidatePath(`/dashboard/email/${data.key}`);
  return { ok: true };
}

/** Сбрасывает шаблон организации к системному (удаляет переопределение). */
export async function resetEmailTemplate(key: string): Promise<ActionResult> {
  if (!z.string().min(1).max(100).safeParse(key).success) {
    return { ok: false, error: "Invalid template." };
  }
  const access = await requireEmailAccess();
  if (!access.ok) {
    return access;
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("email_templates")
    .delete()
    .eq("organization_id", access.organizationId)
    .eq("key", key);
  if (error) {
    return { ok: false, error: "Could not reset the template." };
  }

  revalidatePath("/dashboard/email");
  revalidatePath(`/dashboard/email/${key}`);
  return { ok: true };
}

/**
 * Отправляет тестовое письмо текущему пользователю на основе шаблона —
 * чтобы проверить вёрстку транзакционного письма. Переменные шаблона
 * подставляются образцами (company_name/first_name — реальные).
 */
export async function sendTestNotification(key: string): Promise<ActionResult> {
  if (!z.string().min(1).max(100).safeParse(key).success) {
    return { ok: false, error: "Invalid template." };
  }
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false, error: "No active organization." };
  }
  if (!hasPermission(context, "email.manage")) {
    return { ok: false, error: "You do not have permission to manage email." };
  }
  const recipient = await resolveUserRecipient(context.user.id);
  if (!recipient) {
    return { ok: false, error: "Your account has no email for the test." };
  }

  const admin = createAdminClient();
  const { data: orgTpl } = await admin
    .from("email_templates")
    .select("*")
    .eq("organization_id", context.organization.id)
    .eq("key", key)
    .maybeSingle();
  let tpl = orgTpl;
  if (!tpl) {
    const { data: sysTpl } = await admin
      .from("email_templates")
      .select("*")
      .is("organization_id", null)
      .eq("key", key)
      .maybeSingle();
    tpl = sysTpl;
  }
  if (!tpl) {
    return { ok: false, error: "Unknown email template." };
  }

  const companyName = context.organization.name;
  const variables: Record<string, string> = {};
  for (const variable of TEMPLATE_VARIABLES) {
    variables[variable] = `[${variable}]`;
  }
  variables.company_name = companyName;
  variables.first_name =
    (recipient.name ?? "").trim().split(/\s+/)[0] || "there";

  const subject = `[TEST] ${renderText(tpl.subject, variables)}`;
  const content = renderHtml(tpl.body_html, variables);
  const html = wrapEmailHtml(content, companyName);
  const text = tpl.body_text
    ? renderText(tpl.body_text, variables)
    : htmlToText(content);

  const result = await sendEmail({
    organizationId: context.organization.id,
    notificationEventId: null,
    templateKey: key,
    toEmail: recipient.email,
    fromName: companyName || "Notifications",
    subject,
    html,
    text,
  });
  if (!result.ok) {
    return { ok: false, error: result.error ?? "Could not send the test email." };
  }
  return { ok: true };
}

/** Сохраняет настройку уведомления уровня организации. */
export async function saveNotificationPreference(
  input: NotificationPreferenceInput,
): Promise<ActionResult> {
  const parsed = notificationPreferenceSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid preference." };
  }
  const data = parsed.data;
  const access = await requireEmailAccess();
  if (!access.ok) {
    return access;
  }

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("notification_preferences")
    .select("id")
    .eq("organization_id", access.organizationId)
    .eq("event_type", data.eventType)
    .is("user_id", null)
    .maybeSingle();

  if (existing) {
    const { error } = await admin
      .from("notification_preferences")
      .update({ enabled: data.enabled })
      .eq("id", existing.id);
    if (error) {
      return { ok: false, error: "Could not save the preference." };
    }
  } else {
    const { error } = await admin.from("notification_preferences").insert({
      organization_id: access.organizationId,
      event_type: data.eventType,
      enabled: data.enabled,
    });
    if (error) {
      return { ok: false, error: "Could not save the preference." };
    }
  }

  revalidatePath("/dashboard/email");
  return { ok: true };
}
