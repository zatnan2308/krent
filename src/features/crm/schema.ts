import { z } from "zod";

const LEAD_FORM_KINDS = ["contact", "showing", "valuation", "rental"] as const;
const LEAD_STATUS_VALUES = [
  "new",
  "contacted",
  "qualified",
  "unqualified",
  "converted",
  "lost",
] as const;
const TASK_PRIORITY_VALUES = ["low", "medium", "high"] as const;
const TASK_STATUS_VALUES = ["open", "completed", "cancelled"] as const;

/** Тип публичной формы захвата лида. */
export type LeadFormKind = (typeof LEAD_FORM_KINDS)[number];

/** UTM- и click-данные, собранные на клиенте. Все поля опциональны. */
export const attributionInputSchema = z.object({
  utmSource: z.string().max(300).nullable(),
  utmMedium: z.string().max(300).nullable(),
  utmCampaign: z.string().max(300).nullable(),
  utmContent: z.string().max(300).nullable(),
  utmTerm: z.string().max(300).nullable(),
  gclid: z.string().max(500).nullable(),
  gbraid: z.string().max(500).nullable(),
  wbraid: z.string().max(500).nullable(),
  fbclid: z.string().max(500).nullable(),
  fbc: z.string().max(500).nullable(),
  fbp: z.string().max(500).nullable(),
  landingPage: z.string().max(2000).nullable(),
  firstPage: z.string().max(2000).nullable(),
  lastPage: z.string().max(2000).nullable(),
  referrer: z.string().max(2000).nullable(),
});
export type AttributionInput = z.infer<typeof attributionInputSchema>;

/** Публичная форма захвата лида. */
export const submitLeadSchema = z.object({
  kind: z.enum(LEAD_FORM_KINDS),
  name: z.string().min(1).max(200),
  email: z.email().max(320),
  phone: z.string().max(60).nullable(),
  message: z.string().max(4000).nullable(),
  propertyId: z.uuid().nullable(),
  locationInterest: z.string().max(300).nullable(),
  budgetMin: z.number().nonnegative().nullable(),
  budgetMax: z.number().nonnegative().nullable(),
  preferredTime: z.string().max(200).nullable(),
  locale: z.string().max(12).nullable(),
  currency: z.string().max(12).nullable(),
  pagePath: z.string().max(2000).nullable(),
  attribution: attributionInputSchema,
});
export type SubmitLeadInput = z.infer<typeof submitLeadSchema>;

/** Заметка к лиду / контакту / сделке. */
export const createNoteSchema = z.object({
  body: z.string().min(1).max(4000),
  contactId: z.uuid().nullable(),
  leadId: z.uuid().nullable(),
  dealId: z.uuid().nullable(),
});
export type CreateNoteInput = z.infer<typeof createNoteSchema>;

/** Задача CRM. */
export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullable(),
  dueDate: z.string().max(20).nullable(),
  priority: z.enum(TASK_PRIORITY_VALUES),
  assignedAgentId: z.uuid().nullable(),
  contactId: z.uuid().nullable(),
  leadId: z.uuid().nullable(),
  dealId: z.uuid().nullable(),
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

/** Схемы для простых enum-обновлений. */
export const leadStatusSchema = z.enum(LEAD_STATUS_VALUES);
export const taskStatusSchema = z.enum(TASK_STATUS_VALUES);

/** Результат server action. */
export type ActionResult = { ok: true } | { ok: false; error: string };
