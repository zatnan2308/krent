import type { Enums, Tables } from "@/types/database";

// ---- Алиасы строк таблиц email-кампаний -----------------------
export type ContactSegment = Tables<"contact_segments">;
export type ContactSegmentMember = Tables<"contact_segment_members">;
export type ContactConsent = Tables<"contact_consents">;
export type Campaign = Tables<"campaigns">;
export type CampaignTemplate = Tables<"campaign_templates">;
export type CampaignBlock = Tables<"campaign_blocks">;
export type CampaignRecipient = Tables<"campaign_recipients">;
export type CampaignReport = Tables<"campaign_reports">;
export type EmailUnsubscribe = Tables<"email_unsubscribes">;

// ---- Алиасы enum-типов ----------------------------------------
export type CampaignStatus = Enums<"campaign_status">;
export type CampaignRecipientStatus = Enums<"campaign_recipient_status">;
export type ConsentStatus = Enums<"consent_status">;
