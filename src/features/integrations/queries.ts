import { createAdminClient } from "@/lib/supabase/server";

import { PROVIDER_LABELS } from "./constants";
import type {
  IntegrationConnection,
  IntegrationProvider,
  IntegrationStatus,
} from "./types";

// ---- Список подключений ---------------------------------------

export interface ConnectionItem {
  id: string;
  provider: IntegrationProvider;
  displayName: string;
  status: IntegrationStatus;
  accountId: string | null;
  lastSyncedAt: string | null;
  errorMessage: string | null;
}

/** Подключения интеграций организации. */
export async function listIntegrations(
  organizationId: string,
): Promise<ConnectionItem[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("integration_connections")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((row: IntegrationConnection) => ({
    id: row.id,
    provider: row.provider,
    displayName: row.display_name ?? PROVIDER_LABELS[row.provider],
    status: row.status,
    accountId: row.account_id,
    lastSyncedAt: row.last_synced_at,
    errorMessage: row.error_message,
  }));
}

/** Подключение конкретного провайдера (если есть). */
export async function getProviderConnection(
  organizationId: string,
  provider: IntegrationProvider,
): Promise<IntegrationConnection | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("integration_connections")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("provider", provider)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

// ---- Search Console overview ----------------------------------

export interface GscOverview {
  rangeDays: number;
  totals: {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  };
  topQueries: {
    value: string;
    clicks: number;
    impressions: number;
    position: number;
  }[];
  topPages: {
    value: string;
    clicks: number;
    impressions: number;
    position: number;
  }[];
  topCountries: { value: string; clicks: number }[];
  topDevices: { value: string; clicks: number }[];
  opportunities: {
    type: string;
    query: string | null;
    page: string | null;
    impressions: number;
    clicks: number;
    position: number | null;
    recommendation: string | null;
  }[];
}

function emptyGscOverview(days: number): GscOverview {
  return {
    rangeDays: days,
    totals: { clicks: 0, impressions: 0, ctr: 0, position: 0 },
    topQueries: [],
    topPages: [],
    topCountries: [],
    topDevices: [],
    opportunities: [],
  };
}

/** Сводка Search Console: тоталы по дням + топ-запросы/страницы/etc. */
export async function getGscOverview(
  organizationId: string,
  days = 30,
): Promise<GscOverview> {
  const admin = createAdminClient();
  const since = new Date(Date.now() - days * 86400_000)
    .toISOString()
    .slice(0, 10);

  const [reportsResult, opportunitiesResult] = await Promise.all([
    admin
      .from("seo_reports")
      .select("*")
      .eq("organization_id", organizationId)
      .gte("date", since),
    admin
      .from("seo_opportunities")
      .select("*")
      .eq("organization_id", organizationId)
      .order("impressions", { ascending: false })
      .limit(10),
  ]);

  const rows = reportsResult.data ?? [];
  if (rows.length === 0) {
    return {
      ...emptyGscOverview(days),
      opportunities: (opportunitiesResult.data ?? []).map((row) => ({
        type: row.opportunity_type,
        query: row.query,
        page: row.page,
        impressions: row.impressions,
        clicks: row.clicks,
        position: row.position,
        recommendation: row.recommendation,
      })),
    };
  }

  const overall = rows.filter((row) => row.dimension === "overall");
  const totalsBase = overall.length > 0 ? overall : rows;
  let clicks = 0;
  let impressions = 0;
  let positionSum = 0;
  let positionCount = 0;
  for (const row of totalsBase) {
    clicks += row.clicks;
    impressions += row.impressions;
    if (row.position > 0) {
      positionSum += row.position;
      positionCount += 1;
    }
  }
  const totals = {
    clicks,
    impressions,
    ctr: impressions > 0 ? clicks / impressions : 0,
    position: positionCount > 0 ? positionSum / positionCount : 0,
  };

  function aggregate(
    dimension: string,
  ): { value: string; clicks: number; impressions: number; position: number }[] {
    const map = new Map<
      string,
      { clicks: number; impressions: number; positionSum: number; positionCount: number }
    >();
    for (const row of rows) {
      if (row.dimension !== dimension) continue;
      const key = row.dimension_value ?? "";
      if (!key) continue;
      const current = map.get(key) ?? {
        clicks: 0,
        impressions: 0,
        positionSum: 0,
        positionCount: 0,
      };
      current.clicks += row.clicks;
      current.impressions += row.impressions;
      if (row.position > 0) {
        current.positionSum += row.position;
        current.positionCount += 1;
      }
      map.set(key, current);
    }
    return [...map.entries()]
      .map(([value, stats]) => ({
        value,
        clicks: stats.clicks,
        impressions: stats.impressions,
        position:
          stats.positionCount > 0
            ? stats.positionSum / stats.positionCount
            : 0,
      }))
      .sort((left, right) => right.clicks - left.clicks)
      .slice(0, 10);
  }

  const topQueries = aggregate("query");
  const topPages = aggregate("page");
  const topCountriesFull = aggregate("country");
  const topDevicesFull = aggregate("device");

  return {
    rangeDays: days,
    totals,
    topQueries,
    topPages,
    topCountries: topCountriesFull.map((row) => ({
      value: row.value,
      clicks: row.clicks,
    })),
    topDevices: topDevicesFull.map((row) => ({
      value: row.value,
      clicks: row.clicks,
    })),
    opportunities: (opportunitiesResult.data ?? []).map((row) => ({
      type: row.opportunity_type,
      query: row.query,
      page: row.page,
      impressions: row.impressions,
      clicks: row.clicks,
      position: row.position,
      recommendation: row.recommendation,
    })),
  };
}

// ---- Ad campaigns overview ------------------------------------

export interface AdsOverview {
  rangeDays: number;
  currency: string;
  totals: {
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    leads: number;
  };
  ctr: number;
  cpc: number;
  cpm: number;
  cpa: number;
  costPerLead: number;
  campaigns: {
    externalId: string;
    name: string;
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    leads: number;
    ctr: number;
    cpc: number;
  }[];
}

function emptyAdsOverview(days: number): AdsOverview {
  return {
    rangeDays: days,
    currency: "USD",
    totals: {
      spend: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      leads: 0,
    },
    ctr: 0,
    cpc: 0,
    cpm: 0,
    cpa: 0,
    costPerLead: 0,
    campaigns: [],
  };
}

/** Сводка по рекламным кампаниям одного провайдера за окно `days`. */
export async function getAdsOverview(
  organizationId: string,
  provider: IntegrationProvider,
  days = 30,
): Promise<AdsOverview> {
  const admin = createAdminClient();
  const since = new Date(Date.now() - days * 86400_000)
    .toISOString()
    .slice(0, 10);

  const { data } = await admin
    .from("ad_campaign_reports")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("provider", provider)
    .gte("date", since);
  const rows = data ?? [];
  if (rows.length === 0) {
    return emptyAdsOverview(days);
  }

  const currency = rows[0]?.currency ?? "USD";
  let spend = 0;
  let impressions = 0;
  let clicks = 0;
  let conversions = 0;
  let leads = 0;

  const campaignMap = new Map<
    string,
    {
      name: string;
      spend: number;
      impressions: number;
      clicks: number;
      conversions: number;
      leads: number;
    }
  >();

  for (const row of rows) {
    spend += Number(row.spend);
    impressions += Number(row.impressions);
    clicks += Number(row.clicks);
    conversions += Number(row.conversions);
    leads += Number(row.leads);

    if (row.level !== "campaign") {
      continue;
    }
    const current = campaignMap.get(row.external_campaign_id) ?? {
      name: row.name,
      spend: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      leads: 0,
    };
    current.spend += Number(row.spend);
    current.impressions += Number(row.impressions);
    current.clicks += Number(row.clicks);
    current.conversions += Number(row.conversions);
    current.leads += Number(row.leads);
    current.name = row.name;
    campaignMap.set(row.external_campaign_id, current);
  }

  const ctr = impressions > 0 ? clicks / impressions : 0;
  const cpc = clicks > 0 ? spend / clicks : 0;
  const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
  const cpa = conversions > 0 ? spend / conversions : 0;
  const costPerLead = leads > 0 ? spend / leads : 0;

  const campaigns = [...campaignMap.entries()]
    .map(([externalId, stats]) => ({
      externalId,
      name: stats.name,
      spend: stats.spend,
      impressions: stats.impressions,
      clicks: stats.clicks,
      conversions: stats.conversions,
      leads: stats.leads,
      ctr: stats.impressions > 0 ? stats.clicks / stats.impressions : 0,
      cpc: stats.clicks > 0 ? stats.spend / stats.clicks : 0,
    }))
    .sort((left, right) => right.spend - left.spend)
    .slice(0, 20);

  return {
    rangeDays: days,
    currency,
    totals: { spend, impressions, clicks, conversions, leads },
    ctr,
    cpc,
    cpm,
    cpa,
    costPerLead,
    campaigns,
  };
}
