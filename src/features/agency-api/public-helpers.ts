import { createAdminClient } from "@/lib/supabase/server";

import { dispatchWebhookEvent } from "./webhooks";
import type { ApiAuthContext } from "./types";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Находит или создаёт контакт по email (если есть) либо по комбинации
 * имя + телефон. Возвращает contact_id для последующей вставки лида.
 */
async function ensureContact(
  admin: Admin,
  input: {
    organizationId: string;
    name: string;
    email: string | null;
    phone: string | null;
    locale?: string;
    currency?: string;
  },
): Promise<string | null> {
  const email = input.email?.trim().toLowerCase() ?? null;
  if (email) {
    const { data: existing } = await admin
      .from("contacts")
      .select("id")
      .eq("organization_id", input.organizationId)
      .eq("email", email)
      .maybeSingle();
    if (existing) {
      return existing.id;
    }
  }
  const { data: created, error } = await admin
    .from("contacts")
    .insert({
      organization_id: input.organizationId,
      full_name: input.name.trim(),
      email,
      phone: input.phone,
      preferred_language: input.locale ?? null,
      preferred_currency: input.currency ?? null,
    })
    .select("id")
    .single();
  if (error || !created) {
    if (!email) {
      return null;
    }
    const { data: retry } = await admin
      .from("contacts")
      .select("id")
      .eq("organization_id", input.organizationId)
      .eq("email", email)
      .maybeSingle();
    return retry?.id ?? null;
  }
  return created.id;
}

/** Проверка, что объект существует в той же организации и принадлежит агенту. */
async function ensureAgentOwnsProperty(
  admin: Admin,
  auth: ApiAuthContext,
  propertyId: string,
): Promise<{ ok: true } | { ok: false }> {
  if (!auth.agentId) {
    // Ключи уровня агентства имеют полный доступ к объектам организации.
    const { data: property } = await admin
      .from("properties")
      .select("id, organization_id")
      .eq("id", propertyId)
      .maybeSingle();
    if (!property || property.organization_id !== auth.organizationId) {
      return { ok: false };
    }
    return { ok: true };
  }
  const { data: property } = await admin
    .from("properties")
    .select("id, organization_id, assigned_agent_id, co_agent_ids")
    .eq("id", propertyId)
    .maybeSingle();
  if (!property || property.organization_id !== auth.organizationId) {
    return { ok: false };
  }
  if (
    property.assigned_agent_id !== auth.agentId &&
    !property.co_agent_ids.includes(auth.agentId)
  ) {
    return { ok: false };
  }
  return { ok: true };
}

export type ApiCreateResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string };

interface LeadCreateInput {
  propertyId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  message: string | null;
  source: string | null;
}

/** Создание CRM-лида от имени агента (scope create:leads). */
export async function createLeadFromApi(
  auth: ApiAuthContext,
  input: LeadCreateInput,
): Promise<ApiCreateResult<{ id: string }>> {
  const admin = createAdminClient();
  if (input.propertyId) {
    const check = await ensureAgentOwnsProperty(admin, auth, input.propertyId);
    if (!check.ok) {
      return {
        ok: false,
        status: 404,
        error: "Property not found for this agent.",
      };
    }
  }
  const contactId = await ensureContact(admin, {
    organizationId: auth.organizationId,
    name: input.name,
    email: input.email,
    phone: input.phone,
  });
  if (!contactId) {
    return { ok: false, status: 500, error: "Could not store contact." };
  }
  const { data: lead, error } = await admin
    .from("leads")
    .insert({
      organization_id: auth.organizationId,
      contact_id: contactId,
      assigned_agent_id: auth.agentId,
      property_id: input.propertyId,
      type: "buyer",
      status: "new",
      source: input.source ?? "api",
      message: input.message,
    })
    .select("id")
    .single();
  if (error || !lead) {
    return { ok: false, status: 500, error: "Could not create lead." };
  }
  await dispatchWebhookEvent({
    organizationId: auth.organizationId,
    eventType: "lead.created",
    entityType: "lead",
    entityId: lead.id,
    payload: {
      lead_id: lead.id,
      source: input.source ?? "api",
      property_id: input.propertyId,
      agent_id: auth.agentId,
    },
  });
  return { ok: true, data: { id: lead.id } };
}

interface ShowingCreateInput {
  propertyId: string;
  name: string;
  email: string | null;
  phone: string | null;
  message: string | null;
  preferredAt: string | null;
}

/** Создание лида типа "showing request" (scope create:showing_request). */
export async function createShowingRequestFromApi(
  auth: ApiAuthContext,
  input: ShowingCreateInput,
): Promise<ApiCreateResult<{ id: string }>> {
  const admin = createAdminClient();
  const check = await ensureAgentOwnsProperty(admin, auth, input.propertyId);
  if (!check.ok) {
    return {
      ok: false,
      status: 404,
      error: "Property not found for this agent.",
    };
  }
  const contactId = await ensureContact(admin, {
    organizationId: auth.organizationId,
    name: input.name,
    email: input.email,
    phone: input.phone,
  });
  if (!contactId) {
    return { ok: false, status: 500, error: "Could not store contact." };
  }
  const messageParts: string[] = [];
  if (input.message) messageParts.push(input.message);
  if (input.preferredAt) messageParts.push(`Preferred time: ${input.preferredAt}`);
  const { data: lead, error } = await admin
    .from("leads")
    .insert({
      organization_id: auth.organizationId,
      contact_id: contactId,
      assigned_agent_id: auth.agentId,
      property_id: input.propertyId,
      type: "buyer",
      status: "new",
      source: "api_showing_request",
      message: messageParts.length > 0 ? messageParts.join("\n\n") : null,
    })
    .select("id")
    .single();
  if (error || !lead) {
    return { ok: false, status: 500, error: "Could not create showing request." };
  }
  await dispatchWebhookEvent({
    organizationId: auth.organizationId,
    eventType: "lead.created",
    entityType: "lead",
    entityId: lead.id,
    payload: {
      lead_id: lead.id,
      kind: "showing",
      property_id: input.propertyId,
      preferred_at: input.preferredAt,
      agent_id: auth.agentId,
    },
  });
  return { ok: true, data: { id: lead.id } };
}

interface BookingCreateInput {
  propertyId: string;
  startDate: string;
  endDate: string;
  guests: number;
  name: string;
  email: string | null;
  phone: string | null;
  message: string | null;
}

/** Создание лида типа "booking request" (scope create:booking_request). */
export async function createBookingRequestFromApi(
  auth: ApiAuthContext,
  input: BookingCreateInput,
): Promise<ApiCreateResult<{ id: string }>> {
  const admin = createAdminClient();
  const check = await ensureAgentOwnsProperty(admin, auth, input.propertyId);
  if (!check.ok) {
    return {
      ok: false,
      status: 404,
      error: "Property not found for this agent.",
    };
  }
  const contactId = await ensureContact(admin, {
    organizationId: auth.organizationId,
    name: input.name,
    email: input.email,
    phone: input.phone,
  });
  if (!contactId) {
    return { ok: false, status: 500, error: "Could not store contact." };
  }
  const messageParts: string[] = [
    `Booking request: ${input.startDate} → ${input.endDate}, guests: ${input.guests}`,
  ];
  if (input.message) {
    messageParts.push(input.message);
  }
  const { data: lead, error } = await admin
    .from("leads")
    .insert({
      organization_id: auth.organizationId,
      contact_id: contactId,
      assigned_agent_id: auth.agentId,
      property_id: input.propertyId,
      type: "renter",
      status: "new",
      source: "api_booking_request",
      message: messageParts.join("\n\n"),
    })
    .select("id")
    .single();
  if (error || !lead) {
    return { ok: false, status: 500, error: "Could not create booking request." };
  }
  await dispatchWebhookEvent({
    organizationId: auth.organizationId,
    eventType: "booking.created",
    entityType: "lead",
    entityId: lead.id,
    payload: {
      lead_id: lead.id,
      property_id: input.propertyId,
      start_date: input.startDate,
      end_date: input.endDate,
      guests: input.guests,
      agent_id: auth.agentId,
    },
  });
  return { ok: true, data: { id: lead.id } };
}

/** Профиль агента — то, что разрешено отдавать наружу. */
export async function getAgentProfileForApi(
  organizationId: string,
  agentId: string,
): Promise<
  | {
      id: string;
      name: string | null;
      avatarUrl: string | null;
    }
  | null
> {
  const admin = createAdminClient();
  const { data: member } = await admin
    .from("organization_members")
    .select("user_id, status")
    .eq("organization_id", organizationId)
    .eq("user_id", agentId)
    .maybeSingle();
  if (!member) {
    return null;
  }
  try {
    const { data } = await admin.auth.admin.getUserById(agentId);
    const user = data.user;
    const meta = user?.user_metadata ?? {};
    const metaName =
      (typeof meta.full_name === "string" && meta.full_name.trim()) ||
      (typeof meta.name === "string" && meta.name.trim()) ||
      "";
    const emailName = user?.email ? (user.email.split("@")[0] ?? "") : "";
    const finalName = metaName || emailName || null;
    const avatar =
      typeof meta.avatar_url === "string" && meta.avatar_url.trim()
        ? meta.avatar_url.trim()
        : null;
    return { id: agentId, name: finalName, avatarUrl: avatar };
  } catch {
    return { id: agentId, name: null, avatarUrl: null };
  }
}
