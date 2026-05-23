import type { Tables } from "@/types/database";

// ---- Алиасы строк таблиц analytics -----------------------------
export type AnalyticsSession = Tables<"analytics_sessions">;
export type UtmSession = Tables<"utm_sessions">;
export type AnalyticsEvent = Tables<"analytics_events">;
export type TrackingSettings = Tables<"tracking_settings">;
