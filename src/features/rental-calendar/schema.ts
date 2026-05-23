import { z } from "zod";

const BLOCK_STATUS_VALUES = ["blocked", "maintenance", "cleaning"] as const;
const PROVIDER_VALUES = [
  "airbnb",
  "booking",
  "vrbo",
  "google",
  "custom",
] as const;

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date.");

/** Ручная блокировка дат (block / maintenance / cleaning). */
export const createCalendarEventSchema = z
  .object({
    propertyId: z.uuid(),
    status: z.enum(BLOCK_STATUS_VALUES),
    startDate: isoDate,
    endDate: isoDate,
    title: z.string().max(200).nullable(),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: "End date must be after start date.",
    path: ["endDate"],
  });
export type CreateCalendarEventInput = z.infer<
  typeof createCalendarEventSchema
>;

/** Правила доступности календаря. */
export const availabilityRuleSchema = z.object({
  propertyId: z.uuid(),
  minStay: z.number().int().min(1),
  maxStay: z.number().int().min(1).nullable(),
  checkInDays: z.array(z.number().int().min(0).max(6)),
  checkOutDays: z.array(z.number().int().min(0).max(6)),
  bufferDays: z.number().int().min(0),
  defaultPrice: z.number().nonnegative().nullable(),
  weekendPrice: z.number().nonnegative().nullable(),
  currency: z.string().max(10).nullable(),
});
export type AvailabilityRuleInput = z.infer<typeof availabilityRuleSchema>;

/** Правило цены на диапазон дат. */
export const priceRuleSchema = z
  .object({
    propertyId: z.uuid(),
    startDate: isoDate,
    endDate: isoDate,
    price: z.number().nonnegative(),
    currency: z.string().min(1).max(10),
    minStay: z.number().int().min(1).nullable(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "End date must not be before start date.",
    path: ["endDate"],
  });
export type PriceRuleInput = z.infer<typeof priceRuleSchema>;

/** Источник импорта iCal. */
export const importSourceSchema = z.object({
  propertyId: z.uuid(),
  name: z.string().min(1).max(120),
  provider: z.enum(PROVIDER_VALUES),
  url: z.url().max(2000),
});
export type ImportSourceInput = z.infer<typeof importSourceSchema>;

export type ActionResult = { ok: true } | { ok: false; error: string };
