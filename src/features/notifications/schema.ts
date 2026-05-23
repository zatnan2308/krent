import { z } from "zod";

/** Сохранение email-шаблона организации (переопределение системного). */
export const saveEmailTemplateSchema = z.object({
  key: z.string().min(1).max(100),
  subject: z.string().min(1).max(300),
  bodyHtml: z.string().min(1).max(20000),
  isActive: z.boolean(),
});
export type SaveEmailTemplateInput = z.infer<typeof saveEmailTemplateSchema>;

/** Настройка уведомления уровня организации. */
export const notificationPreferenceSchema = z.object({
  eventType: z.string().min(1).max(100),
  enabled: z.boolean(),
});
export type NotificationPreferenceInput = z.infer<
  typeof notificationPreferenceSchema
>;

/** Результат server action. */
export type ActionResult = { ok: true } | { ok: false; error: string };
