import { z } from "zod";

import type { BookingQuote } from "./pricing";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date.");

/** Запрос расчёта стоимости бронирования (booking widget). */
export const bookingQuoteSchema = z.object({
  propertyId: z.guid(),
  checkIn: isoDate,
  checkOut: isoDate,
  adults: z.number().int().min(1).max(50),
  children: z.number().int().min(0).max(50),
  pets: z.number().int().min(0).max(20),
  promoCode: z.string().max(60).nullable(),
});
export type BookingQuoteRequest = z.infer<typeof bookingQuoteSchema>;

/** Запрос на бронирование с публичного сайта. */
export const requestBookingSchema = bookingQuoteSchema.extend({
  guestName: z.string().min(1).max(200),
  guestEmail: z.email().max(320),
  guestPhone: z.string().max(60).nullable(),
  guestMessage: z.string().max(2000).nullable(),
  locale: z.string().max(12).nullable(),
  /** Путь страницы для возврата после онлайн-оплаты. */
  returnPath: z.string().max(2000).nullable(),
});
export type RequestBookingInput = z.infer<typeof requestBookingSchema>;

/** Результат server action. */
export type ActionResult = { ok: true } | { ok: false; error: string };

/** Результат расчёта стоимости бронирования. */
export type QuoteResult =
  | {
      ok: true;
      quote: BookingQuote;
      available: boolean;
      issues: string[];
    }
  | { ok: false; error: string };

/** Результат создания запроса на бронирование. */
export type RequestBookingResult =
  | { ok: true; bookingId: string; reference: string }
  | { ok: false; error: string };
