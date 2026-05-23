import type {
  AgentCanonicalOwner,
  ApiScopeKey,
  WebhookEventType,
} from "./types";

/** Полный список доступных scope-ключей. */
export const API_SCOPE_KEYS = [
  "read:properties",
  "read:property_details",
  "read:property_media",
  "read:property_amenities",
  "read:property_availability",
  "read:agent_profile",
  "create:leads",
  "create:booking_request",
  "create:showing_request",
] as const satisfies readonly ApiScopeKey[];

/** Человекочитаемые описания scopes для UI. */
export const API_SCOPE_DESCRIPTIONS: Record<ApiScopeKey, string> = {
  "read:properties": "List properties available to the agent.",
  "read:property_details": "Read property details.",
  "read:property_media": "Read property media (images, videos).",
  "read:property_amenities": "Read property amenities.",
  "read:property_availability": "Read property availability calendar.",
  "read:agent_profile": "Read the linked agent profile.",
  "create:leads": "Create CRM leads on behalf of the agent.",
  "create:booking_request": "Create booking requests on behalf of the agent.",
  "create:showing_request": "Create showing requests on behalf of the agent.",
};

/** Поддерживаемые webhook-события. */
export const WEBHOOK_EVENT_TYPES = [
  "property.created",
  "property.updated",
  "property.deleted",
  "property.published",
  "property.unpublished",
  "property.price_changed",
  "property.status_changed",
  "property.media_updated",
  "property.availability_updated",
  "booking.created",
  "booking.cancelled",
  "lead.created",
] as const satisfies readonly WebhookEventType[];

/** Описания webhook-событий для админки. */
export const WEBHOOK_EVENT_DESCRIPTIONS: Record<WebhookEventType, string> = {
  "property.created": "Object created in CRM.",
  "property.updated": "Object fields changed.",
  "property.deleted": "Object removed from CRM.",
  "property.published": "Object became visible to the public.",
  "property.unpublished": "Object hidden from the public.",
  "property.price_changed": "Object price updated.",
  "property.status_changed": "Object status updated.",
  "property.media_updated": "Object photos or videos updated.",
  "property.availability_updated": "Object availability calendar updated.",
  "booking.created": "Booking request created.",
  "booking.cancelled": "Booking cancelled.",
  "lead.created": "New lead captured.",
};

/** Режимы SEO canonical между сайтом агентства и сайтами агентов. */
export const CANONICAL_OWNER_MODES = [
  "agency",
  "agent",
  "both_unique",
  "noindex_agent",
] as const satisfies readonly AgentCanonicalOwner[];

export const CANONICAL_OWNER_LABELS: Record<AgentCanonicalOwner, string> = {
  agency: "Agency page is canonical",
  agent: "Agent page is canonical",
  both_unique: "Both pages have unique content",
  noindex_agent: "Hide agent pages from search engines",
};

/**
 * Поля, которые НИКОГДА не отдаются в публичный API независимо
 * от настроек видимости — privacy hardening.
 */
export const ALWAYS_RESTRICTED_FIELDS = [
  "owner_user_id",
  "internal_notes",
  "commission_amount",
  "commission_percent",
  "private_documents",
] as const;

/** Размер windows для rate limit (минута). */
export const RATE_LIMIT_WINDOW_MS = 60_000;

/** Префикс ключа, который остаётся видимым в админке (для подсказки). */
export const API_KEY_VISIBLE_PREFIX_LENGTH = 12;

/** Полная длина выдаваемого ключа в hex (32 байта → 64 hex-символа). */
export const API_KEY_RAW_BYTES = 32;

/** Префикс ключа, чтобы клиент сразу видел, что это Krent. */
export const API_KEY_PREFIX = "krent_sk_";
