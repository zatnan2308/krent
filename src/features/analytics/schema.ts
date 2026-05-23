import { z } from "zod";

import { ANALYTICS_EVENT_TYPES } from "./constants";

const utmSchema = z.object({
  utm_source: z.string().max(300).nullable(),
  utm_medium: z.string().max(300).nullable(),
  utm_campaign: z.string().max(300).nullable(),
  utm_content: z.string().max(300).nullable(),
  utm_term: z.string().max(300).nullable(),
  gclid: z.string().max(500).nullable(),
  gbraid: z.string().max(500).nullable(),
  wbraid: z.string().max(500).nullable(),
  fbclid: z.string().max(500).nullable(),
  fbc: z.string().max(500).nullable(),
  fbp: z.string().max(500).nullable(),
  landing_page: z.string().max(2000).nullable(),
  referrer: z.string().max(2000).nullable(),
});
export type UtmPayload = z.infer<typeof utmSchema>;

/** Одно событие, приходящее от клиентского трекера. */
export const ingestEventSchema = z.object({
  sessionId: z.string().min(1).max(120),
  eventType: z.enum(ANALYTICS_EVENT_TYPES),
  path: z.string().max(2000).nullable(),
  entityType: z.string().max(60).nullable(),
  entityId: z.uuid().nullable(),
  payload: z.record(z.string(), z.unknown()).nullable(),
  utm: utmSchema.nullable(),
});
export type IngestEventInput = z.infer<typeof ingestEventSchema>;

/** Сохранение настроек tracking-интеграций (dashboard). */
export const saveTrackingSettingsSchema = z.object({
  ga4MeasurementId: z.string().max(60).nullable(),
  gtmId: z.string().max(60).nullable(),
  ga4Enabled: z.boolean(),
  metaPixelId: z.string().max(60).nullable(),
  metaCapiToken: z.string().max(500).nullable(),
  metaPixelEnabled: z.boolean(),
  googleAdsConversionId: z.string().max(60).nullable(),
  googleAdsLabels: z.record(z.string(), z.string()),
  consentModeEnabled: z.boolean(),
});
export type SaveTrackingSettingsInput = z.infer<
  typeof saveTrackingSettingsSchema
>;

export type ActionResult = { ok: true } | { ok: false; error: string };
