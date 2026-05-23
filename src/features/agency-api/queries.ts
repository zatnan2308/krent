import { createAdminClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

import type {
  ApiKey,
  AgentWebsiteConnection,
  AgentFeedSettings,
  PropertyExternalVisibility,
  PropertySyncSettings,
  WebhookDeliveryLog,
  WebhookEndpoint,
  WebhookEvent,
} from "./types";

// ---- Admin: списки и summary ---------------------------------

export interface ApiKeyDto {
  id: string;
  name: string;
  agentId: string | null;
  scopes: string[];
  allowedDomains: string[];
  rateLimitPerMinute: number;
  status: ApiKey["status"];
  keyPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
}

/** Список API-ключей организации. */
export async function listApiKeys(
  organizationId: string,
): Promise<ApiKeyDto[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("api_keys")
    .select(
      "id, name, agent_id, scopes, allowed_domains, rate_limit_per_minute, status, key_prefix, last_used_at, created_at, revoked_at",
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    agentId: row.agent_id,
    scopes: row.scopes,
    allowedDomains: row.allowed_domains,
    rateLimitPerMinute: row.rate_limit_per_minute,
    status: row.status,
    keyPrefix: row.key_prefix,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
    revokedAt: row.revoked_at,
  }));
}

export async function listAgentConnections(
  organizationId: string,
): Promise<AgentWebsiteConnection[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("agent_website_connections")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function listWebhookEndpoints(
  organizationId: string,
): Promise<WebhookEndpoint[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("webhook_endpoints")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function listRecentWebhookEvents(
  organizationId: string,
  limit = 25,
): Promise<WebhookEvent[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("webhook_events")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function listRecentDeliveryLogs(
  organizationId: string,
  limit = 25,
): Promise<WebhookDeliveryLog[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("webhook_delivery_logs")
    .select("*")
    .eq("organization_id", organizationId)
    .order("attempted_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export interface ApiUsageStat {
  date: string;
  total: number;
  errors: number;
}

/** Дневная агрегация по api_usage_logs за N дней. */
export async function getApiUsageSummary(
  organizationId: string,
  days = 14,
): Promise<{ totals: { requests: number; errors: number }; series: ApiUsageStat[] }> {
  const admin = createAdminClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await admin
    .from("api_usage_logs")
    .select("status, occurred_at")
    .eq("organization_id", organizationId)
    .gte("occurred_at", since);
  const rows = data ?? [];
  const buckets = new Map<string, { total: number; errors: number }>();
  let totalRequests = 0;
  let totalErrors = 0;
  for (const row of rows) {
    const day = row.occurred_at.slice(0, 10);
    const bucket = buckets.get(day) ?? { total: 0, errors: 0 };
    bucket.total += 1;
    if (row.status >= 400) {
      bucket.errors += 1;
      totalErrors += 1;
    }
    totalRequests += 1;
    buckets.set(day, bucket);
  }
  const series = [...buckets.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, bucket]) => ({
      date,
      total: bucket.total,
      errors: bucket.errors,
    }));
  return {
    totals: { requests: totalRequests, errors: totalErrors },
    series,
  };
}

export async function getPropertySyncSettings(
  organizationId: string,
): Promise<PropertySyncSettings | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("property_sync_settings")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();
  return data;
}

export async function listExternalVisibility(
  organizationId: string,
  agentWebsiteConnectionId: string,
): Promise<PropertyExternalVisibility[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("property_external_visibility")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("agent_website_connection_id", agentWebsiteConnectionId);
  return data ?? [];
}

export async function getAgentFeedSettings(
  organizationId: string,
  agentWebsiteConnectionId: string,
): Promise<AgentFeedSettings | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("agent_feed_settings")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("agent_website_connection_id", agentWebsiteConnectionId)
    .maybeSingle();
  return data;
}

// ---- Public API: выборки объектов агента --------------------

export interface AgentPropertyRecord {
  property: Tables<"properties">;
  location: Tables<"property_locations"> | null;
  price: Tables<"property_prices"> | null;
  media: Tables<"property_media">[];
  amenities: string[];
  description: string | null;
  publishedAt: string | null;
}

/**
 * Возвращает список объектов агента, разрешённых для публичной выдачи.
 * Фильтрует по статусу/visibility и applied external visibility.
 */
export async function listAgentPropertiesForApi(input: {
  organizationId: string;
  agentId: string;
  locale: string;
  limit?: number;
  offset?: number;
  agentWebsiteConnectionId?: string | null;
}): Promise<AgentPropertyRecord[]> {
  const admin = createAdminClient();
  const limit = input.limit ?? 50;
  const offset = input.offset ?? 0;

  const ownerIds = [input.agentId];
  // Включаем как assigned_agent, так и co_agent_ids.
  const { data: rows } = await admin
    .from("properties")
    .select("*")
    .eq("organization_id", input.organizationId)
    .in("status", ["active"])
    .eq("visibility", "public")
    .or(
      `assigned_agent_id.eq.${input.agentId},co_agent_ids.cs.{${input.agentId}}`,
    )
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);
  const properties = rows ?? [];
  if (properties.length === 0) {
    return [];
  }
  void ownerIds;

  const propertyIds = properties.map((row) => row.id);
  const [locations, prices, media, translations, propAmenities, amenitiesRows] =
    await Promise.all([
      admin
        .from("property_locations")
        .select("*")
        .in("property_id", propertyIds),
      admin
        .from("property_prices")
        .select("*")
        .in("property_id", propertyIds),
      admin
        .from("property_media")
        .select("*")
        .in("property_id", propertyIds)
        .order("sort_order", { ascending: true }),
      admin
        .from("property_translations")
        .select("property_id, locale, description")
        .in("property_id", propertyIds),
      admin
        .from("property_amenities")
        .select("property_id, amenity_id")
        .in("property_id", propertyIds),
      admin.from("amenities").select("id, key, name"),
    ]);

  let externalVisibility: PropertyExternalVisibility[] = [];
  if (input.agentWebsiteConnectionId) {
    externalVisibility = await listExternalVisibility(
      input.organizationId,
      input.agentWebsiteConnectionId,
    );
  }
  const hiddenIds = new Set(
    externalVisibility.filter((row) => !row.visible).map((row) => row.property_id),
  );

  return assembleRecords({
    properties,
    locations: locations.data ?? [],
    prices: prices.data ?? [],
    media: media.data ?? [],
    translations: translations.data ?? [],
    amenityLinks: propAmenities.data ?? [],
    amenitiesIndex: amenitiesRows.data ?? [],
    locale: input.locale,
  }).filter((record) => !hiddenIds.has(record.property.id));
}

/** Один объект для агента (с теми же безопасностью/фильтрацией). */
export async function getAgentPropertyForApi(input: {
  organizationId: string;
  agentId: string;
  propertyId: string;
  locale: string;
}): Promise<AgentPropertyRecord | null> {
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("properties")
    .select("*")
    .eq("organization_id", input.organizationId)
    .eq("id", input.propertyId)
    .maybeSingle();
  if (!row) {
    return null;
  }
  const allowed =
    row.assigned_agent_id === input.agentId ||
    row.co_agent_ids.includes(input.agentId);
  if (!allowed) {
    return null;
  }
  if (row.visibility !== "public" || row.status !== "active") {
    return null;
  }
  const [location, price, media, translations, propAmenities, amenitiesRows] =
    await Promise.all([
      admin
        .from("property_locations")
        .select("*")
        .eq("property_id", row.id)
        .maybeSingle(),
      admin
        .from("property_prices")
        .select("*")
        .eq("property_id", row.id)
        .maybeSingle(),
      admin
        .from("property_media")
        .select("*")
        .eq("property_id", row.id)
        .order("sort_order", { ascending: true }),
      admin
        .from("property_translations")
        .select("property_id, locale, description")
        .eq("property_id", row.id),
      admin
        .from("property_amenities")
        .select("property_id, amenity_id")
        .eq("property_id", row.id),
      admin.from("amenities").select("id, key, name"),
    ]);

  const [first] = assembleRecords({
    properties: [row],
    locations: location.data ? [location.data] : [],
    prices: price.data ? [price.data] : [],
    media: media.data ?? [],
    translations: translations.data ?? [],
    amenityLinks: propAmenities.data ?? [],
    amenitiesIndex: amenitiesRows.data ?? [],
    locale: input.locale,
  });
  return first ?? null;
}

/** Календарь доступности объекта (из rental_calendar). */
export async function getPropertyAvailabilityForApi(input: {
  organizationId: string;
  propertyId: string;
  fromDate: string;
  toDate: string;
}): Promise<
  { date: string; status: string; source: string | null }[]
> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("rental_calendar_events")
    .select("start_date, end_date, status, source")
    .eq("organization_id", input.organizationId)
    .eq("property_id", input.propertyId)
    .gte("end_date", input.fromDate)
    .lte("start_date", input.toDate);
  return (data ?? []).map((row) => ({
    date: row.start_date,
    status: row.status,
    source: row.source ?? null,
  }));
}

/** Сборка AgentPropertyRecord из расщеплённых выборок. */
function assembleRecords(input: {
  properties: Tables<"properties">[];
  locations: Tables<"property_locations">[];
  prices: Tables<"property_prices">[];
  media: Tables<"property_media">[];
  translations: { property_id: string; locale: string; description: string | null }[];
  amenityLinks: { property_id: string; amenity_id: string }[];
  amenitiesIndex: { id: string; key: string; name: string }[];
  locale: string;
}): AgentPropertyRecord[] {
  const amenityName = new Map(
    input.amenitiesIndex.map((row) => [row.id, row.name] as const),
  );
  return input.properties.map((property) => {
    const location =
      input.locations.find((row) => row.property_id === property.id) ?? null;
    const price =
      input.prices.find((row) => row.property_id === property.id) ?? null;
    const media = input.media.filter((row) => row.property_id === property.id);
    const description =
      input.translations.find(
        (row) =>
          row.property_id === property.id && row.locale === input.locale,
      )?.description ??
      input.translations.find((row) => row.property_id === property.id)
        ?.description ??
      null;
    const amenities = input.amenityLinks
      .filter((row) => row.property_id === property.id)
      .map((row) => amenityName.get(row.amenity_id) ?? row.amenity_id);
    return {
      property,
      location,
      price,
      media,
      amenities,
      description,
      publishedAt: property.updated_at,
    };
  });
}

// ---- Helpers ------------------------------------------------

/** Поиск подключения сайта агента по agentId — для widget/feed endpoint'ов. */
export async function findAgentConnectionByAgent(
  organizationId: string,
  agentId: string,
): Promise<AgentWebsiteConnection | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("agent_website_connections")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("agent_id", agentId)
    .maybeSingle();
  return data;
}
