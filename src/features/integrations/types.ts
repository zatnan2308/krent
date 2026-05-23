import type { Enums, Tables } from "@/types/database";

// ---- Алиасы строк таблиц integrations -------------------------
export type IntegrationConnection = Tables<"integration_connections">;
export type GoogleSearchConsoleConnection =
  Tables<"google_search_console_connections">;
export type GoogleAdsConnection = Tables<"google_ads_connections">;
export type MetaAdsConnection = Tables<"meta_ads_connections">;
export type IntegrationToken = Tables<"integration_tokens">;
export type AdCampaignReport = Tables<"ad_campaign_reports">;
export type SeoReport = Tables<"seo_reports">;
export type SeoOpportunity = Tables<"seo_opportunities">;

// ---- Алиасы enum-типов ----------------------------------------
export type IntegrationProvider = Enums<"integration_provider">;
export type IntegrationStatus = Enums<"integration_status">;
