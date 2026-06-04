import { z } from "zod";

import { BLOCK_TYPES } from "./blocks";

const SEGMENT_RULE_VALUES = [
  "all",
  "lead_type",
  "channel",
  "language",
  "currency",
  "city",
  "property_type",
] as const;

/** Метаданные кампании. */
export const saveCampaignSchema = z.object({
  campaignId: z.guid(),
  name: z.string().min(1).max(200),
  subject: z.string().max(300),
  previewText: z.string().max(300),
  language: z.string().max(12),
  senderName: z.string().max(120),
  segmentId: z.guid().nullable(),
});
export type SaveCampaignInput = z.infer<typeof saveCampaignSchema>;

/** Блок письма кампании. */
const blockSchema = z.object({
  type: z.enum(BLOCK_TYPES),
  content: z.record(z.string(), z.unknown()),
});

/** Сохранение блоков письма кампании. */
export const saveCampaignBlocksSchema = z.object({
  campaignId: z.guid(),
  blocks: z.array(blockSchema).max(60),
});
export type SaveCampaignBlocksInput = z.infer<
  typeof saveCampaignBlocksSchema
>;

/** Отправка тестового письма кампании. */
export const sendTestSchema = z.object({
  campaignId: z.guid(),
  email: z.email().max(320),
});
export type SendTestInput = z.infer<typeof sendTestSchema>;

/** Планирование кампании (placeholder — без авто-отправки). */
export const scheduleCampaignSchema = z.object({
  campaignId: z.guid(),
  scheduledAt: z.string().min(1).max(40),
});
export type ScheduleCampaignInput = z.infer<typeof scheduleCampaignSchema>;

/** Создание сегмента контактов. */
export const createSegmentSchema = z.object({
  name: z.string().min(1).max(160),
  description: z.string().max(400).nullable(),
  rule: z.enum(SEGMENT_RULE_VALUES),
  value: z.string().max(120),
});
export type CreateSegmentInput = z.infer<typeof createSegmentSchema>;

export type ActionResult = { ok: true } | { ok: false; error: string };
