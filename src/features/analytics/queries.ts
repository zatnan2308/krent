import { unstable_cache } from "next/cache";

import { CHANNEL_LABELS } from "@/features/messaging/channels";
import { createAdminClient } from "@/lib/supabase/server";

import type { TrackingSettings } from "./types";

// ---- Публичная конфигурация tracking --------------------------

export interface PublicTrackingConfig {
  ga4MeasurementId: string | null;
  gtmId: string | null;
  ga4Enabled: boolean;
  metaPixelId: string | null;
  metaPixelEnabled: boolean;
  googleAdsConversionId: string | null;
  googleAdsLabels: Record<string, string>;
  consentModeEnabled: boolean;
}

const EMPTY_CONFIG: PublicTrackingConfig = {
  ga4MeasurementId: null,
  gtmId: null,
  ga4Enabled: false,
  metaPixelId: null,
  metaPixelEnabled: false,
  googleAdsConversionId: null,
  googleAdsLabels: {},
  consentModeEnabled: false,
};

/** Конфиг tracking-интеграций для публичного клиентского трекера (кэш 60s). */
const getPublicTrackingConfigCached = unstable_cache(
  async (organizationId: string): Promise<PublicTrackingConfig> => {
    const admin = createAdminClient();
    const { data } = await admin
      .from("tracking_settings")
      .select("*")
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (!data) {
      return EMPTY_CONFIG;
    }
    const rawLabels = data.google_ads_labels as Record<string, unknown> | null;
    const labels: Record<string, string> = {};
    if (rawLabels && typeof rawLabels === "object") {
      for (const [key, value] of Object.entries(rawLabels)) {
        if (typeof value === "string") {
          labels[key] = value;
        }
      }
    }
    return {
      ga4MeasurementId: data.ga4_measurement_id,
      gtmId: data.gtm_id,
      ga4Enabled: data.ga4_enabled,
      metaPixelId: data.meta_pixel_id,
      metaPixelEnabled: data.meta_pixel_enabled,
      googleAdsConversionId: data.google_ads_conversion_id,
      googleAdsLabels: labels,
      consentModeEnabled: data.consent_mode_enabled,
    };
  },
  ["public-tracking-config"],
  { revalidate: 60, tags: ["public-site"] },
);

export async function getPublicTrackingConfig(
  organizationId: string,
): Promise<PublicTrackingConfig> {
  return getPublicTrackingConfigCached(organizationId);
}

/** Полные настройки tracking организации (включая CAPI токен) для формы. */
export async function getTrackingSettings(
  organizationId: string,
): Promise<TrackingSettings | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("tracking_settings")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();
  return data;
}

// ---- Аналитический dashboard ----------------------------------

export interface AnalyticsOverview {
  rangeDays: number;
  sessions: number;
  pageViews: number;
  events: number;
  leads: number;
  bookings: number;
  conversionRate: number;
  bookingConversion: number;
  topProperties: { propertyId: string; title: string; views: number }[];
  topSources: { source: string; count: number }[];
  leadSources: { source: string; count: number }[];
  recentEvents: {
    eventType: string;
    path: string | null;
    occurredAt: string;
  }[];
}

/** Аналитика организации за окно `days` суток. */
export async function getAnalyticsOverview(
  organizationId: string,
  days = 30,
): Promise<AnalyticsOverview> {
  const admin = createAdminClient();
  const since = new Date(Date.now() - days * 86400_000).toISOString();

  const [
    sessionsResult,
    eventsResult,
    leadsResult,
    bookingsResult,
    utmResult,
    attributionResult,
    channelsResult,
  ] = await Promise.all([
    admin
      .from("analytics_sessions")
      .select("id")
      .eq("organization_id", organizationId)
      .gte("last_seen_at", since),
    admin
      .from("analytics_events")
      .select("event_type, entity_id, path, occurred_at")
      .eq("organization_id", organizationId)
      .gte("occurred_at", since),
    admin
      .from("leads")
      .select("id")
      .eq("organization_id", organizationId)
      .gte("created_at", since),
    admin
      .from("rental_bookings")
      .select("id")
      .eq("organization_id", organizationId)
      .gte("created_at", since),
    admin
      .from("utm_sessions")
      .select("utm_source")
      .eq("organization_id", organizationId)
      .gte("captured_at", since),
    admin
      .from("lead_attribution")
      .select("utm_source")
      .eq("organization_id", organizationId)
      .gte("created_at", since),
    admin
      .from("messaging_conversations")
      .select("channel")
      .eq("organization_id", organizationId)
      .gte("created_at", since),
  ]);

  const sessions = sessionsResult.data?.length ?? 0;
  const eventRows = eventsResult.data ?? [];
  const events = eventRows.length;
  const pageViews = eventRows.filter(
    (row) => row.event_type === "page_view",
  ).length;
  const leads = leadsResult.data?.length ?? 0;
  const bookings = bookingsResult.data?.length ?? 0;
  const conversionRate = sessions > 0 ? leads / sessions : 0;
  const bookingConversion = sessions > 0 ? bookings / sessions : 0;

  // Top properties по числу property_view.
  const viewCounts = new Map<string, number>();
  for (const row of eventRows) {
    if (row.event_type === "property_view" && row.entity_id) {
      viewCounts.set(row.entity_id, (viewCounts.get(row.entity_id) ?? 0) + 1);
    }
  }
  const topPropertyEntries = [...viewCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 8);
  const titles = new Map<string, string>();
  if (topPropertyEntries.length > 0) {
    const { data: properties } = await admin
      .from("properties")
      .select("id, title")
      .in(
        "id",
        topPropertyEntries.map(([id]) => id),
      );
    for (const property of properties ?? []) {
      titles.set(property.id, property.title);
    }
  }
  const topProperties = topPropertyEntries.map(([id, views]) => ({
    propertyId: id,
    title: titles.get(id) ?? "Property",
    views,
  }));

  // Top sources из utm_sessions.
  const sourceCounts = new Map<string, number>();
  for (const row of utmResult.data ?? []) {
    const source = (row.utm_source ?? "").trim() || "direct";
    sourceCounts.set(source, (sourceCounts.get(source) ?? 0) + 1);
  }
  const topSources = [...sourceCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 8)
    .map(([source, count]) => ({ source, count }));

  // Lead sources из lead_attribution + входящие из каналов мессенджеров
  // (каждый новый канальный диалог за окно — отдельный источник привлечения).
  const leadSourceCounts = new Map<string, number>();
  for (const row of attributionResult.data ?? []) {
    const source = (row.utm_source ?? "").trim() || "direct";
    leadSourceCounts.set(
      source,
      (leadSourceCounts.get(source) ?? 0) + 1,
    );
  }
  for (const row of channelsResult.data ?? []) {
    const source = CHANNEL_LABELS[row.channel] ?? row.channel;
    leadSourceCounts.set(source, (leadSourceCounts.get(source) ?? 0) + 1);
  }
  const leadSources = [...leadSourceCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 8)
    .map(([source, count]) => ({ source, count }));

  // Последние 20 событий.
  const recentEvents = [...eventRows]
    .sort((left, right) =>
      right.occurred_at.localeCompare(left.occurred_at),
    )
    .slice(0, 20)
    .map((row) => ({
      eventType: row.event_type,
      path: row.path,
      occurredAt: row.occurred_at,
    }));

  return {
    rangeDays: days,
    sessions,
    pageViews,
    events,
    leads,
    bookings,
    conversionRate,
    bookingConversion,
    topProperties,
    topSources,
    leadSources,
    recentEvents,
  };
}
