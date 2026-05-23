import type { IntegrationProvider, IntegrationStatus } from "./types";

export const PROVIDER_LABELS: Record<IntegrationProvider, string> = {
  gsc: "Google Search Console",
  google_ads: "Google Ads",
  meta_ads: "Meta Ads",
};

export const PROVIDER_DESCRIPTIONS: Record<IntegrationProvider, string> = {
  gsc: "Query and page performance from Search Console.",
  google_ads: "Campaign spend, clicks and conversions from Google Ads.",
  meta_ads: "Campaign spend, clicks and leads from Meta Ads.",
};

export const STATUS_LABELS: Record<IntegrationStatus, string> = {
  pending: "Pending",
  connected: "Connected",
  disconnected: "Disconnected",
  error: "Error",
};

export const STATUS_BADGE: Record<
  IntegrationStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  pending: "outline",
  connected: "default",
  disconnected: "secondary",
  error: "destructive",
};

/** Минимальные scopes-плейсхолдеры под будущий OAuth. */
export const DEFAULT_SCOPES: Record<IntegrationProvider, string[]> = {
  gsc: ["https://www.googleapis.com/auth/webmasters.readonly"],
  google_ads: ["https://www.googleapis.com/auth/adwords"],
  meta_ads: ["ads_read", "ads_management"],
};

/** Типы оффлайн-конверсий, которые планируется выгружать в платформы. */
export const OFFLINE_CONVERSION_TYPES = [
  {
    key: "lead_qualified",
    label: "Lead qualified",
    description: "Lead moved to qualified status in CRM.",
  },
  {
    key: "appointment_booked",
    label: "Appointment booked",
    description: "Showing or call scheduled with the agent.",
  },
  {
    key: "booking_confirmed",
    label: "Booking confirmed",
    description: "Rental booking confirmed for the property.",
  },
  {
    key: "deal_closed",
    label: "Deal closed",
    description: "Sale or rental contract signed.",
  },
] as const;

/** Предупреждения по рекламе недвижимости (housing/special ad category). */
export const REAL_ESTATE_AD_WARNINGS = [
  "Real estate ads may require the Housing or Special Ad Category — check the platform's policies before launching campaigns.",
  "Targeting options for housing ads are restricted by Google and Meta in some countries (notably the US, Canada and the EU).",
];
