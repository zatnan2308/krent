import { createAdminClient } from "@/lib/supabase/server";

import type { EmailSend } from "./types";

/** Строка списка email-шаблонов в админке. */
export interface TemplateListItem {
  key: string;
  name: string;
  subject: string;
  isActive: boolean;
  isCustomised: boolean;
}

/**
 * Список email-шаблонов: системные шаблоны с пометкой, переопределён ли
 * каждый из них организацией.
 */
export async function listEmailTemplates(
  organizationId: string,
): Promise<TemplateListItem[]> {
  const admin = createAdminClient();
  const [systemResult, orgResult] = await Promise.all([
    admin
      .from("email_templates")
      .select("*")
      .is("organization_id", null)
      .order("key", { ascending: true }),
    admin
      .from("email_templates")
      .select("*")
      .eq("organization_id", organizationId),
  ]);
  const system = systemResult.data ?? [];
  const overrides = orgResult.data ?? [];

  return system.map((template) => {
    const override = overrides.find((item) => item.key === template.key);
    const effective = override ?? template;
    return {
      key: template.key,
      name: template.name,
      subject: effective.subject,
      isActive: effective.is_active,
      isCustomised: override !== undefined,
    };
  });
}

/** Эффективный шаблон письма + системные значения для сброса. */
export interface EffectiveEmailTemplate {
  key: string;
  name: string;
  subject: string;
  bodyHtml: string;
  isActive: boolean;
  isCustomised: boolean;
  systemSubject: string;
  systemBodyHtml: string;
}

/** Один email-шаблон: переопределение организации либо системный. */
export async function getEmailTemplate(
  organizationId: string,
  key: string,
): Promise<EffectiveEmailTemplate | null> {
  const admin = createAdminClient();
  const { data: system } = await admin
    .from("email_templates")
    .select("*")
    .is("organization_id", null)
    .eq("key", key)
    .maybeSingle();
  if (!system) {
    return null;
  }
  const { data: override } = await admin
    .from("email_templates")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("key", key)
    .maybeSingle();
  const effective = override ?? system;

  return {
    key: system.key,
    name: system.name,
    subject: effective.subject,
    bodyHtml: effective.body_html,
    isActive: effective.is_active,
    isCustomised: override !== null,
    systemSubject: system.subject,
    systemBodyHtml: system.body_html,
  };
}

/** Событие каталога с настройкой уровня организации. */
export interface EventPreference {
  key: string;
  name: string;
  description: string | null;
  audience: string;
  isTransactional: boolean;
  enabled: boolean;
}

/** Каталог событий уведомлений с org-level настройками. */
export async function getNotificationCatalog(
  organizationId: string,
): Promise<EventPreference[]> {
  const admin = createAdminClient();
  const [catalogResult, prefsResult] = await Promise.all([
    admin
      .from("notification_templates")
      .select("*")
      .order("key", { ascending: true }),
    admin
      .from("notification_preferences")
      .select("event_type, enabled")
      .eq("organization_id", organizationId)
      .is("user_id", null),
  ]);
  const catalog = catalogResult.data ?? [];
  const prefs = prefsResult.data ?? [];

  return catalog.map((row) => {
    const pref = prefs.find((item) => item.event_type === row.key);
    return {
      key: row.key,
      name: row.name,
      description: row.description,
      audience: row.audience,
      isTransactional: row.is_transactional,
      enabled: pref ? pref.enabled : true,
    };
  });
}

/** Последние отправленные письма организации — журнал доставки. */
export async function listEmailSends(
  organizationId: string,
  limit = 60,
): Promise<EmailSend[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("email_sends")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}
