import { z } from "zod";

import {
  API_SCOPE_KEYS,
  CANONICAL_OWNER_MODES,
  WEBHOOK_EVENT_TYPES,
} from "./constants";

/** Создание API-ключа. */
export const createApiKeySchema = z.object({
  name: z.string().trim().min(1).max(120),
  agentId: z.guid().nullable(),
  scopes: z
    .array(z.enum(API_SCOPE_KEYS))
    .min(1)
    .max(API_SCOPE_KEYS.length),
  allowedDomains: z.array(z.string().trim().min(1).max(200)).max(20),
  rateLimitPerMinute: z.number().int().min(1).max(6000),
});
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;

/** Отзыв ключа. */
export const revokeApiKeySchema = z.object({
  id: z.guid(),
});
export type RevokeApiKeyInput = z.infer<typeof revokeApiKeySchema>;

/** Сохранение подключения сайта агента. */
export const saveAgentConnectionSchema = z.object({
  id: z.guid().nullable(),
  agentId: z.guid(),
  name: z.string().trim().min(1).max(160),
  primaryDomain: z.string().trim().max(200).nullable(),
  canonicalOwner: z.enum(CANONICAL_OWNER_MODES),
  isActive: z.boolean(),
});
export type SaveAgentConnectionInput = z.infer<
  typeof saveAgentConnectionSchema
>;

/** Сохранение webhook-эндпоинта. */
export const saveWebhookEndpointSchema = z.object({
  id: z.guid().nullable(),
  agentWebsiteConnectionId: z.guid().nullable(),
  url: z.url().max(500),
  secret: z.string().max(200).nullable(),
  eventTypes: z
    .array(z.enum(WEBHOOK_EVENT_TYPES))
    .min(1),
  isActive: z.boolean(),
});
export type SaveWebhookEndpointInput = z.infer<
  typeof saveWebhookEndpointSchema
>;

/** Удаление webhook-эндпоинта. */
export const deleteWebhookEndpointSchema = z.object({
  id: z.guid(),
});
export type DeleteWebhookEndpointInput = z.infer<
  typeof deleteWebhookEndpointSchema
>;

/** Удаление подключения сайта агента. */
export const deleteAgentConnectionSchema = z.object({
  id: z.guid(),
});
export type DeleteAgentConnectionInput = z.infer<
  typeof deleteAgentConnectionSchema
>;

/** Настройки видимости конкретного объекта на сайте агента. */
export const setExternalVisibilitySchema = z.object({
  propertyId: z.guid(),
  agentWebsiteConnectionId: z.guid(),
  visible: z.boolean(),
});
export type SetExternalVisibilityInput = z.infer<
  typeof setExternalVisibilitySchema
>;

/** Общие настройки sync на уровне организации. */
export const savePropertySyncSettingsSchema = z.object({
  defaultCanonicalOwner: z.enum(CANONICAL_OWNER_MODES),
  hideOwnerContacts: z.boolean(),
  hideInternalNotes: z.boolean(),
  hideCommission: z.boolean(),
  hidePrivateDocuments: z.boolean(),
});
export type SavePropertySyncSettingsInput = z.infer<
  typeof savePropertySyncSettingsSchema
>;

/** Настройки фида сайта агента. */
export const saveAgentFeedSettingsSchema = z.object({
  agentWebsiteConnectionId: z.guid(),
  defaultLocale: z.string().trim().min(2).max(10),
  defaultCurrency: z.string().trim().min(3).max(10),
});
export type SaveAgentFeedSettingsInput = z.infer<
  typeof saveAgentFeedSettingsSchema
>;

/** Создание лида через публичный API. */
export const createLeadApiSchema = z.object({
  propertyId: z.guid().nullable(),
  name: z.string().trim().min(1).max(200),
  email: z.email().nullable(),
  phone: z.string().trim().max(60).nullable(),
  message: z.string().trim().max(2000).nullable(),
  source: z.string().trim().max(120).nullable(),
});
export type CreateLeadApiInput = z.infer<typeof createLeadApiSchema>;

/** Создание showing request через публичный API. */
export const createShowingRequestApiSchema = z.object({
  propertyId: z.guid(),
  name: z.string().trim().min(1).max(200),
  email: z.email().nullable(),
  phone: z.string().trim().max(60).nullable(),
  message: z.string().trim().max(2000).nullable(),
  preferredAt: z.string().min(1).nullable(),
});
export type CreateShowingRequestApiInput = z.infer<
  typeof createShowingRequestApiSchema
>;

/** Создание booking request через публичный API. */
export const createBookingRequestApiSchema = z.object({
  propertyId: z.guid(),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  guests: z.number().int().min(1).max(50),
  name: z.string().trim().min(1).max(200),
  email: z.email().nullable(),
  phone: z.string().trim().max(60).nullable(),
  message: z.string().trim().max(2000).nullable(),
});
export type CreateBookingRequestApiInput = z.infer<
  typeof createBookingRequestApiSchema
>;

export type ActionResult = { ok: true } | { ok: false; error: string };

export type ActionResultWithKey =
  | { ok: true; rawKey: string; prefix: string }
  | { ok: false; error: string };
