"use server";

import { headers } from "next/headers";

import { dispatchWebhookEvent } from "@/features/agency-api/webhooks";
import { createAdminClient } from "@/lib/supabase/server";
import { resolvePublicOrganization } from "@/server/public-site";

import { notifyNewLead } from "./notifications";
import {
  submitLeadSchema,
  type ActionResult,
  type LeadFormKind,
  type SubmitLeadInput,
} from "./schema";
import type { DeviceType, LeadType } from "./types";

/** Определяет тип устройства по User-Agent. */
function detectDevice(userAgent: string): DeviceType {
  const ua = userAgent.toLowerCase();
  if (!ua) {
    return "unknown";
  }
  if (
    /ipad|tablet|playbook|silk/.test(ua) ||
    (/android/.test(ua) && !/mobile/.test(ua))
  ) {
    return "tablet";
  }
  if (/mobi|iphone|ipod|windows phone/.test(ua)) {
    return "mobile";
  }
  return "desktop";
}

/** Сопоставляет тип формы с типом лида и источником. */
function mapLeadKind(
  kind: LeadFormKind,
  hasProperty: boolean,
): { type: LeadType; source: string } {
  switch (kind) {
    case "showing":
      return { type: "buyer", source: "showing_request" };
    case "valuation":
      return { type: "valuation", source: "valuation_request" };
    case "rental":
      return { type: "renter", source: "rental_inquiry" };
    case "contact":
    default:
      return {
        type: "buyer",
        source: hasProperty ? "property_inquiry" : "website",
      };
  }
}

/**
 * Публичный приём лида с сайта. Организация резолвится по домену на
 * сервере; запись идёт сервис-клиентом, минуя RLS. Все данные формы
 * проходят серверную валидацию zod, UTM и click ID сохраняются.
 */
export async function submitLead(
  input: SubmitLeadInput,
): Promise<ActionResult> {
  const parsed = submitLeadSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the form and try again." };
  }
  const data = parsed.data;

  const organization = await resolvePublicOrganization();
  if (!organization) {
    return { ok: false, error: "This site is not available right now." };
  }

  const admin = createAdminClient();
  const requestHeaders = headers();
  const device = detectDevice(requestHeaders.get("user-agent") ?? "");
  const country = requestHeaders.get("x-vercel-ip-country");
  const city = requestHeaders.get("x-vercel-ip-city");
  const host =
    (requestHeaders.get("host") ?? "").split(":")[0]?.toLowerCase() ?? "";

  const email = data.email.trim().toLowerCase();

  // ---- Контакт: найти по email либо создать -------------------
  let contactId: string;
  const { data: existingContact } = await admin
    .from("contacts")
    .select("id")
    .eq("organization_id", organization.id)
    .eq("email", email)
    .maybeSingle();
  if (existingContact) {
    contactId = existingContact.id;
  } else {
    const { data: createdContact, error: contactError } = await admin
      .from("contacts")
      .insert({
        organization_id: organization.id,
        full_name: data.name.trim(),
        email,
        phone: data.phone,
        preferred_language: data.locale,
        preferred_currency: data.currency,
      })
      .select("id")
      .single();
    if (contactError || !createdContact) {
      // Возможна гонка по уникальному индексу — пробуем найти снова.
      const { data: retry } = await admin
        .from("contacts")
        .select("id")
        .eq("organization_id", organization.id)
        .eq("email", email)
        .maybeSingle();
      if (!retry) {
        return { ok: false, error: "Could not save your details." };
      }
      contactId = retry.id;
    } else {
      contactId = createdContact.id;
    }
  }

  // ---- Привязка к объекту и агенту ----------------------------
  let propertyId: string | null = null;
  let assignedAgentId: string | null = null;
  if (data.propertyId) {
    const { data: property } = await admin
      .from("properties")
      .select("id, assigned_agent_id, organization_id")
      .eq("id", data.propertyId)
      .maybeSingle();
    if (property && property.organization_id === organization.id) {
      propertyId = property.id;
      assignedAgentId = property.assigned_agent_id;
    }
  }

  const { type: leadType, source } = mapLeadKind(
    data.kind,
    propertyId !== null,
  );

  // Желаемое время показа дописываем в текст сообщения.
  const messageParts: string[] = [];
  if (data.message && data.message.trim()) {
    messageParts.push(data.message.trim());
  }
  if (data.preferredTime && data.preferredTime.trim()) {
    messageParts.push(`Preferred time: ${data.preferredTime.trim()}`);
  }
  const message = messageParts.length > 0 ? messageParts.join("\n\n") : null;

  // ---- Лид ----------------------------------------------------
  const { data: lead, error: leadError } = await admin
    .from("leads")
    .insert({
      organization_id: organization.id,
      assigned_agent_id: assignedAgentId,
      contact_id: contactId,
      property_id: propertyId,
      type: leadType,
      status: "new",
      source,
      source_domain: host || null,
      message,
      budget_min: data.budgetMin,
      budget_max: data.budgetMax,
      location_interest: data.locationInterest,
      language: data.locale,
      currency: data.currency,
    })
    .select("id")
    .single();
  if (leadError || !lead) {
    return {
      ok: false,
      error: "Could not submit your inquiry. Please try again.",
    };
  }

  // ---- Атрибуция (UTM, click ID, страницы) -------------------
  const attribution = data.attribution;
  await admin.from("lead_attribution").insert({
    organization_id: organization.id,
    lead_id: lead.id,
    utm_source: attribution.utmSource,
    utm_medium: attribution.utmMedium,
    utm_campaign: attribution.utmCampaign,
    utm_content: attribution.utmContent,
    utm_term: attribution.utmTerm,
    gclid: attribution.gclid,
    gbraid: attribution.gbraid,
    wbraid: attribution.wbraid,
    fbclid: attribution.fbclid,
    fbc: attribution.fbc,
    fbp: attribution.fbp,
    landing_page: attribution.landingPage,
    first_page: attribution.firstPage,
    last_page: attribution.lastPage ?? data.pagePath,
    referrer: attribution.referrer,
    device,
    country,
    city,
  });

  // ---- Уведомление (плейсхолдер email-события) ---------------
  await notifyNewLead({
    organizationId: organization.id,
    leadId: lead.id,
    contactName: data.name.trim(),
    leadType,
    source,
  });

  // ---- Webhook агентским сайтам ------------------------------
  await dispatchWebhookEvent({
    organizationId: organization.id,
    eventType: "lead.created",
    entityType: "lead",
    entityId: lead.id,
    payload: {
      lead_id: lead.id,
      property_id: propertyId,
      source,
      lead_type: leadType,
    },
  });

  return { ok: true };
}
