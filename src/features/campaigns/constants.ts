import type { BlockType } from "./blocks";
import type { CampaignRecipientStatus, CampaignStatus } from "./types";

export const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  header: "Header",
  logo: "Logo",
  hero: "Hero image",
  text: "Text",
  button: "Button",
  property_card: "Property card",
  property_grid: "Property grid",
  agent_card: "Agent card",
  testimonial: "Testimonial",
  divider: "Divider",
  footer: "Footer",
  unsubscribe: "Unsubscribe block",
};

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  sending: "Sending",
  sent: "Sent",
  failed: "Failed",
};

export const CAMPAIGN_STATUS_BADGE: Record<
  CampaignStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  draft: "outline",
  scheduled: "secondary",
  sending: "secondary",
  sent: "default",
  failed: "destructive",
};

export const RECIPIENT_STATUS_LABELS: Record<
  CampaignRecipientStatus,
  string
> = {
  pending: "Pending",
  sent: "Sent",
  failed: "Failed",
  skipped: "Skipped",
};

/** Правила динамических сегментов. */
export const SEGMENT_RULES = [
  { value: "all", label: "All contacts" },
  { value: "lead_type", label: "Lead type" },
  { value: "role", label: "Contact role" },
  { value: "lifecycle", label: "Lifecycle stage" },
  { value: "tag", label: "Tag" },
  { value: "channel", label: "Acquisition channel" },
  { value: "language", label: "Language" },
  { value: "currency", label: "Currency" },
  { value: "city", label: "Interested city" },
  { value: "property_type", label: "Property type" },
] as const;

export type SegmentRule = (typeof SEGMENT_RULES)[number]["value"];

/** Каналы привлечения для правила сегмента channel. */
export const SEGMENT_CHANNELS = [
  { value: "google_ads", label: "Google Ads leads" },
  { value: "meta_ads", label: "Meta Ads leads" },
  { value: "organic", label: "Organic / SEO leads" },
] as const;
