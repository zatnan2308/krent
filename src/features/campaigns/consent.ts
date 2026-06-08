import { createAdminClient } from "@/lib/supabase/server";

type Admin = ReturnType<typeof createAdminClient>;

/** Email-адреса, отписавшиеся от маркетинга в организации (в нижнем регистре). */
export async function loadUnsubscribedEmails(
  admin: Admin,
  organizationId: string,
): Promise<Set<string>> {
  const result = new Set<string>();
  const { data } = await admin
    .from("email_unsubscribes")
    .select("email")
    .eq("organization_id", organizationId);
  for (const row of data ?? []) {
    result.add(row.email.toLowerCase());
  }
  return result;
}

/**
 * Email-адреса, по которым нельзя слать письма: жёсткие (постоянные) bounce
 * и жалобы на спам (complaint). Возвращается множество в нижнем регистре.
 * Resend в `email.bounced` обычно сообщает постоянные отказы; неизвестный
 * тип трактуем как постоянный, мягкие (soft/transient) — пропускаем.
 */
export async function loadSuppressedEmails(
  admin: Admin,
  organizationId: string,
): Promise<Set<string>> {
  const result = new Set<string>();
  const [bounces, complaints] = await Promise.all([
    admin
      .from("email_bounces")
      .select("email, bounce_type")
      .eq("organization_id", organizationId),
    admin
      .from("email_complaints")
      .select("email")
      .eq("organization_id", organizationId),
  ]);
  for (const row of bounces.data ?? []) {
    const type = (row.bounce_type ?? "").toLowerCase();
    const transient = type.includes("soft") || type.includes("transient");
    if (!transient && row.email) {
      result.add(row.email.toLowerCase());
    }
  }
  for (const row of complaints.data ?? []) {
    if (row.email) result.add(row.email.toLowerCase());
  }
  return result;
}

/** contact_id с отозванным согласием на маркетинг. */
export async function loadWithdrawnContactIds(
  admin: Admin,
  organizationId: string,
): Promise<Set<string>> {
  const result = new Set<string>();
  const { data } = await admin
    .from("contact_consents")
    .select("contact_id")
    .eq("organization_id", organizationId)
    .eq("consent_type", "marketing")
    .eq("status", "withdrawn");
  for (const row of data ?? []) {
    result.add(row.contact_id);
  }
  return result;
}

/**
 * Записывает согласие на маркетинг (granted) либо его отзыв (withdrawn).
 * Одна строка на пару (contact, consent_type) — upsert вручную.
 */
export async function setMarketingConsent(
  admin: Admin,
  organizationId: string,
  contactId: string,
  granted: boolean,
  source: string,
): Promise<void> {
  const now = new Date().toISOString();
  const { data: existing } = await admin
    .from("contact_consents")
    .select("id")
    .eq("contact_id", contactId)
    .eq("consent_type", "marketing")
    .maybeSingle();

  if (existing) {
    await admin
      .from("contact_consents")
      .update({
        status: granted ? "granted" : "withdrawn",
        source,
        granted_at: granted ? now : undefined,
        withdrawn_at: granted ? null : now,
      })
      .eq("id", existing.id);
  } else {
    await admin.from("contact_consents").insert({
      organization_id: organizationId,
      contact_id: contactId,
      consent_type: "marketing",
      status: granted ? "granted" : "withdrawn",
      source,
      granted_at: granted ? now : null,
      withdrawn_at: granted ? null : now,
    });
  }
}
