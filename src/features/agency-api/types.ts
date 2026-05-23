import type { Enums, Tables } from "@/types/database";

// ---- Алиасы строк таблиц --------------------------------------
export type AgentWebsiteConnection = Tables<"agent_website_connections">;
export type ApiKey = Tables<"api_keys">;
export type ApiScope = Tables<"api_scopes">;
export type ApiUsageLog = Tables<"api_usage_logs">;
export type ApiRateLimit = Tables<"api_rate_limits">;
export type ExternalDomain = Tables<"external_domains">;
export type WebhookEndpoint = Tables<"webhook_endpoints">;
export type WebhookEvent = Tables<"webhook_events">;
export type WebhookDeliveryLog = Tables<"webhook_delivery_logs">;
export type PropertySyncSettings = Tables<"property_sync_settings">;
export type PropertyExternalVisibility =
  Tables<"property_external_visibility">;
export type AgentFeedSettings = Tables<"agent_feed_settings">;

// ---- Алиасы enum-типов ----------------------------------------
export type AgentCanonicalOwner = Enums<"agent_canonical_owner">;
export type ApiKeyStatus = Enums<"api_key_status">;
export type WebhookEventStatus = Enums<"webhook_event_status">;
export type ExternalDomainStatus = Enums<"external_domain_status">;

/** Полный список scope-ключей агентского API. */
export type ApiScopeKey =
  | "read:properties"
  | "read:property_details"
  | "read:property_media"
  | "read:property_amenities"
  | "read:property_availability"
  | "read:agent_profile"
  | "create:leads"
  | "create:booking_request"
  | "create:showing_request";

/** Типы webhook-событий, которые умеет отправлять платформа. */
export type WebhookEventType =
  | "property.created"
  | "property.updated"
  | "property.deleted"
  | "property.published"
  | "property.unpublished"
  | "property.price_changed"
  | "property.status_changed"
  | "property.media_updated"
  | "property.availability_updated"
  | "booking.created"
  | "booking.cancelled"
  | "lead.created";

/** Аутентифицированный API-контекст для публичных endpoint'ов. */
export interface ApiAuthContext {
  keyId: string;
  organizationId: string;
  agentId: string | null;
  scopes: string[];
  allowedDomains: string[];
}

/** Результат проверки API-ключа. */
export type ApiAuthResult =
  | { ok: true; auth: ApiAuthContext }
  | { ok: false; status: number; error: string };
