import { createAdminClient } from "@/lib/supabase/server";

type Admin = ReturnType<typeof createAdminClient>;

function sinceIso(days: number): string {
  return new Date(Date.now() - days * 86400_000).toISOString();
}

// ---- Funnel ---------------------------------------------------

export interface FunnelRow {
  step: string;
  count: number;
}

/**
 * Funnel visit → property view → lead → appointment → booking → payment
 * → closed deal за окно `days` суток.
 */
export async function getFunnelReport(
  organizationId: string,
  days = 30,
): Promise<FunnelRow[]> {
  const admin = createAdminClient();
  const since = sinceIso(days);

  const [sessions, propertyViews, leads, appointments, bookings, payments, deals] =
    await Promise.all([
      countRows(admin, "analytics_sessions", organizationId, "last_seen_at", since),
      admin
        .from("analytics_events")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("event_type", "property_view")
        .gte("occurred_at", since),
      countRows(admin, "leads", organizationId, "created_at", since),
      admin
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("source", "showing_request")
        .gte("created_at", since),
      countRows(
        admin,
        "rental_bookings",
        organizationId,
        "created_at",
        since,
      ),
      admin
        .from("rental_payments")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("status", "succeeded")
        .gte("paid_at", since),
      admin
        .from("deals")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("status", "won")
        .gte("created_at", since),
    ]);

  return [
    { step: "Visits", count: sessions ?? 0 },
    { step: "Property views", count: propertyViews.count ?? 0 },
    { step: "Leads", count: leads ?? 0 },
    { step: "Appointment requests", count: appointments.count ?? 0 },
    { step: "Bookings", count: bookings ?? 0 },
    { step: "Payments succeeded", count: payments.count ?? 0 },
    { step: "Deals closed", count: deals.count ?? 0 },
  ];
}

// ---- Source reports -------------------------------------------

export interface SourceReportRow {
  source: string;
  leads: number;
  bookings: number;
}

/** Источники по UTM/source: SEO, ads, email, direct, referral, agent sites. */
export async function getSourceReport(
  organizationId: string,
  days = 30,
): Promise<SourceReportRow[]> {
  const admin = createAdminClient();
  const since = sinceIso(days);
  const [{ data: leads }, { data: bookings }, { data: attributions }] =
    await Promise.all([
      admin
        .from("leads")
        .select("id, source")
        .eq("organization_id", organizationId)
        .gte("created_at", since),
      admin
        .from("rental_bookings")
        .select("id, source")
        .eq("organization_id", organizationId)
        .gte("created_at", since),
      admin
        .from("lead_attribution")
        .select("lead_id, utm_source, utm_medium")
        .eq("organization_id", organizationId)
        .gte("created_at", since),
    ]);

  const sourceFor = new Map<string, string>();
  for (const row of attributions ?? []) {
    sourceFor.set(row.lead_id, normaliseSource(row.utm_source, row.utm_medium));
  }
  const buckets = new Map<string, { leads: number; bookings: number }>();
  for (const lead of leads ?? []) {
    const key = sourceFor.get(lead.id) ?? mapLeadSource(lead.source);
    const bucket = buckets.get(key) ?? { leads: 0, bookings: 0 };
    bucket.leads += 1;
    buckets.set(key, bucket);
  }
  for (const booking of bookings ?? []) {
    const key = mapBookingSource(booking.source);
    const bucket = buckets.get(key) ?? { leads: 0, bookings: 0 };
    bucket.bookings += 1;
    buckets.set(key, bucket);
  }
  return [...buckets.entries()]
    .map(([source, value]) => ({ source, ...value }))
    .sort((a, b) => b.leads + b.bookings - (a.leads + a.bookings));
}

function normaliseSource(
  utmSource: string | null,
  utmMedium: string | null,
): string {
  const s = (utmSource ?? "").toLowerCase();
  const m = (utmMedium ?? "").toLowerCase();
  if (s === "google" && (m === "cpc" || m === "paidsearch")) return "Google Ads";
  if (s === "meta" || s === "facebook" || s === "instagram") return "Meta Ads";
  if (s === "google" && (m === "organic" || !m)) return "SEO";
  if (m === "email") return "Email campaign";
  if (s === "agent_site" || m === "agent_site") return "External agent site";
  if (s === "referral" || m === "referral") return "Referral";
  if (!s && !m) return "Direct";
  return utmSource?.trim() || "Other";
}

function mapLeadSource(source: string | null): string {
  if (!source) return "Direct";
  if (source.startsWith("api_")) return "External agent site";
  if (source === "campaign") return "Email campaign";
  if (source === "website") return "Direct";
  return source;
}

function mapBookingSource(
  source: "website" | "agent" | "airbnb_import" | "booking_import",
): string {
  switch (source) {
    case "website":
      return "Direct";
    case "agent":
      return "Agent (manual)";
    case "airbnb_import":
      return "Airbnb";
    case "booking_import":
      return "Booking.com";
  }
}

// ---- Property reports -----------------------------------------

export interface PropertyReportRow {
  propertyId: string;
  title: string;
  views: number;
  leads: number;
  bookingRequests: number;
  conversionRate: number;
  revenue: number;
}

/** По объектам: views, leads, booking requests, conversion, revenue. */
export async function getPropertyReport(
  organizationId: string,
  days = 30,
): Promise<PropertyReportRow[]> {
  const admin = createAdminClient();
  const since = sinceIso(days);
  const [
    { data: properties },
    { data: views },
    { data: leads },
    { data: bookings },
    { data: payments },
  ] = await Promise.all([
    admin
      .from("properties")
      .select("id, title")
      .eq("organization_id", organizationId),
    admin
      .from("analytics_events")
      .select("entity_id")
      .eq("organization_id", organizationId)
      .eq("event_type", "property_view")
      .gte("occurred_at", since),
    admin
      .from("leads")
      .select("property_id")
      .eq("organization_id", organizationId)
      .not("property_id", "is", null)
      .gte("created_at", since),
    admin
      .from("rental_bookings")
      .select("property_id")
      .eq("organization_id", organizationId)
      .gte("created_at", since),
    admin
      .from("rental_payments")
      .select("amount, booking_id")
      .eq("organization_id", organizationId)
      .eq("status", "succeeded")
      .gte("paid_at", since),
  ]);

  const viewMap = countBy(views ?? [], "entity_id");
  const leadMap = countBy(leads ?? [], "property_id");
  const bookingMap = countBy(bookings ?? [], "property_id");

  const bookingToProperty = new Map<string, string>();
  if (bookings) {
    for (const row of bookings) {
      if (row.property_id) bookingToProperty.set(row.property_id, row.property_id);
    }
  }

  // Сумма выручки по объекту через rental_bookings.property_id (через payments).
  const { data: bookingRows } = await admin
    .from("rental_bookings")
    .select("id, property_id")
    .eq("organization_id", organizationId)
    .gte("created_at", since);
  const bookingProperty = new Map<string, string>();
  for (const row of bookingRows ?? []) {
    bookingProperty.set(row.id, row.property_id);
  }
  const revenueMap = new Map<string, number>();
  for (const payment of payments ?? []) {
    const propertyId = bookingProperty.get(payment.booking_id);
    if (!propertyId) continue;
    revenueMap.set(propertyId, (revenueMap.get(propertyId) ?? 0) + payment.amount);
  }

  return (properties ?? [])
    .map((property) => {
      const views = viewMap.get(property.id) ?? 0;
      const leadsCount = leadMap.get(property.id) ?? 0;
      const bookingsCount = bookingMap.get(property.id) ?? 0;
      return {
        propertyId: property.id,
        title: property.title,
        views,
        leads: leadsCount,
        bookingRequests: bookingsCount,
        conversionRate: views > 0 ? leadsCount / views : 0,
        revenue: revenueMap.get(property.id) ?? 0,
      };
    })
    .sort((a, b) => b.views - a.views);
}

// ---- Agent reports --------------------------------------------

export interface AgentReportRow {
  agentId: string;
  assignedLeads: number;
  contactedLeads: number;
  appointments: number;
  deals: number;
  bookings: number;
  revenue: number;
}

/** По агентам: assigned/contacted leads, deals, bookings, revenue. */
export async function getAgentReport(
  organizationId: string,
  days = 30,
): Promise<AgentReportRow[]> {
  const admin = createAdminClient();
  const since = sinceIso(days);
  const [{ data: leads }, { data: deals }, { data: bookingsRows }] = await Promise.all([
    admin
      .from("leads")
      .select("assigned_agent_id, status, source")
      .eq("organization_id", organizationId)
      .gte("created_at", since)
      .not("assigned_agent_id", "is", null),
    admin
      .from("deals")
      .select("assigned_agent_id")
      .eq("organization_id", organizationId)
      .eq("status", "won")
      .gte("created_at", since)
      .not("assigned_agent_id", "is", null),
    admin
      .from("properties")
      .select("id, assigned_agent_id")
      .eq("organization_id", organizationId)
      .not("assigned_agent_id", "is", null),
  ]);

  const map = new Map<string, AgentReportRow>();
  function bucket(agentId: string): AgentReportRow {
    let row = map.get(agentId);
    if (!row) {
      row = {
        agentId,
        assignedLeads: 0,
        contactedLeads: 0,
        appointments: 0,
        deals: 0,
        bookings: 0,
        revenue: 0,
      };
      map.set(agentId, row);
    }
    return row;
  }

  for (const lead of leads ?? []) {
    if (!lead.assigned_agent_id) continue;
    const row = bucket(lead.assigned_agent_id);
    row.assignedLeads += 1;
    if (lead.status !== "new") row.contactedLeads += 1;
    if (lead.source === "showing_request") row.appointments += 1;
  }
  for (const deal of deals ?? []) {
    if (!deal.assigned_agent_id) continue;
    bucket(deal.assigned_agent_id).deals += 1;
  }

  // Bookings + revenue: связь идёт через properties.assigned_agent_id.
  const propertyAgent = new Map<string, string>();
  for (const row of bookingsRows ?? []) {
    if (row.assigned_agent_id) propertyAgent.set(row.id, row.assigned_agent_id);
  }
  const propertyIds = [...propertyAgent.keys()];
  if (propertyIds.length > 0) {
    const { data: bookings } = await admin
      .from("rental_bookings")
      .select("id, property_id")
      .in("property_id", propertyIds)
      .gte("created_at", since);
    const bookingToProperty = new Map<string, string>();
    for (const row of bookings ?? []) {
      bookingToProperty.set(row.id, row.property_id);
      const agent = propertyAgent.get(row.property_id);
      if (agent) bucket(agent).bookings += 1;
    }
    const { data: payments } = await admin
      .from("rental_payments")
      .select("amount, booking_id")
      .eq("organization_id", organizationId)
      .eq("status", "succeeded")
      .gte("paid_at", since);
    for (const payment of payments ?? []) {
      const propertyId = bookingToProperty.get(payment.booking_id);
      if (!propertyId) continue;
      const agent = propertyAgent.get(propertyId);
      if (!agent) continue;
      bucket(agent).revenue += payment.amount;
    }
  }

  return [...map.values()].sort((a, b) => b.assignedLeads - a.assignedLeads);
}

// ---- Email campaign reports ----------------------------------

export interface CampaignReportRow {
  campaignId: string;
  name: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  unsubscribed: number;
}

export async function getCampaignReport(
  organizationId: string,
  days = 60,
): Promise<CampaignReportRow[]> {
  const admin = createAdminClient();
  void days;
  const { data: reports } = await admin
    .from("campaign_reports")
    .select(
      "campaign_id, opened_count, clicked_count, sent_count, delivered_count, unsubscribed_count, campaigns(name)",
    )
    .eq("organization_id", organizationId);
  const rows: CampaignReportRow[] = [];
  for (const row of reports ?? []) {
    rows.push({
      campaignId: row.campaign_id,
      name:
        (row.campaigns as { name: string | null } | null)?.name ?? row.campaign_id,
      sent: row.sent_count ?? 0,
      delivered: row.delivered_count ?? 0,
      opened: row.opened_count ?? 0,
      clicked: row.clicked_count ?? 0,
      unsubscribed: row.unsubscribed_count ?? 0,
    });
  }
  return rows.sort((a, b) => b.sent - a.sent);
}

// ---- Rental reports ------------------------------------------

export interface RentalReportSummary {
  totalNights: number;
  blockedNights: number;
  bookedNights: number;
  occupancy: number;
  revenue: number;
  adr: number;
  directBookingShare: number;
}

export async function getRentalReport(
  organizationId: string,
  days = 30,
): Promise<RentalReportSummary> {
  const admin = createAdminClient();
  const since = sinceIso(days);
  const sinceDate = new Date(since);
  const today = new Date();
  const elapsedDays = Math.max(
    1,
    Math.round((today.getTime() - sinceDate.getTime()) / 86400_000),
  );

  const [{ data: properties }, { data: events }, { data: bookings }, { data: payments }] =
    await Promise.all([
      admin
        .from("properties")
        .select("id, purpose")
        .eq("organization_id", organizationId),
      admin
        .from("rental_calendar_events")
        .select("status, start_date, end_date")
        .eq("organization_id", organizationId)
        .gte("end_date", since),
      admin
        .from("rental_bookings")
        .select("id, source, nights")
        .eq("organization_id", organizationId)
        .gte("created_at", since),
      admin
        .from("rental_payments")
        .select("amount, booking_id")
        .eq("organization_id", organizationId)
        .eq("status", "succeeded")
        .gte("paid_at", since),
    ]);

  const rentalProperties = (properties ?? []).filter(
    (row) =>
      row.purpose === "short_term_rental" || row.purpose === "mixed",
  );
  const totalNights = rentalProperties.length * elapsedDays;

  let blocked = 0;
  let booked = 0;
  for (const event of events ?? []) {
    const start = new Date(event.start_date);
    const end = new Date(event.end_date);
    const nights = Math.max(
      0,
      Math.round((end.getTime() - start.getTime()) / 86400_000),
    );
    if (event.status === "blocked" || event.status === "maintenance") {
      blocked += nights;
    } else if (event.status === "booked") {
      booked += nights;
    }
  }

  const bookingNights = (bookings ?? []).reduce(
    (acc, row) => acc + (row.nights ?? 0),
    0,
  );
  const directBookings = (bookings ?? []).filter(
    (row) => row.source === "website" || row.source === "agent",
  ).length;
  const totalBookings = bookings?.length ?? 0;
  const revenue = (payments ?? []).reduce((acc, p) => acc + p.amount, 0);

  return {
    totalNights,
    blockedNights: blocked,
    bookedNights: booked,
    occupancy: totalNights > 0 ? booked / totalNights : 0,
    revenue,
    adr: bookingNights > 0 ? revenue / bookingNights : 0,
    directBookingShare:
      totalBookings > 0 ? directBookings / totalBookings : 0,
  };
}

// ---- helpers --------------------------------------------------

async function countRows(
  admin: Admin,
  table:
    | "analytics_sessions"
    | "leads"
    | "rental_bookings",
  organizationId: string,
  timestampColumn: string,
  since: string,
): Promise<number> {
  const { count } = await admin
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .gte(timestampColumn, since);
  return count ?? 0;
}

function countBy<T extends { [key: string]: string | null | undefined }>(
  rows: T[],
  key: keyof T,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    const value = row[key];
    if (typeof value !== "string") continue;
    map.set(value, (map.get(value) ?? 0) + 1);
  }
  return map;
}
