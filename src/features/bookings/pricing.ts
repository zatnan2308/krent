import {
  addDays,
  dayOfWeek,
  nightsBetween,
} from "@/features/rental-calendar/date-utils";

/** Пятница (5) и суббота (6) — ночи по выходному тарифу. */
const WEEKEND_DAYS = new Set([5, 6]);

export type RateTier = "default" | "weekend" | "seasonal";

/** Сезонное правило цены (упрощённая форма rental_price_rules). */
export interface SeasonalRate {
  startDate: string;
  endDate: string;
  price: number;
}

/** Параметры расчёта посуточной ставки. */
export interface NightlyRateConfig {
  defaultPrice: number;
  weekendPrice: number | null;
  seasonalRates: SeasonalRate[];
}

/** Результат применения промокода. */
export interface PromoResult {
  code: string;
  discount: number;
  label: string;
}

export interface QuoteNight {
  date: string;
  price: number;
  tier: RateTier;
}

export interface BookingQuoteInput {
  checkIn: string;
  checkOut: string;
  currency: string;
  nightly: NightlyRateConfig;
  cleaningFee: number;
  securityDeposit: number;
  taxes: number;
  promo: PromoResult | null;
}

export interface BookingQuote {
  checkIn: string;
  checkOut: string;
  nights: number;
  currency: string;
  nightlyBreakdown: QuoteNight[];
  subtotal: number;
  cleaningFee: number;
  securityDeposit: number;
  taxes: number;
  discount: number;
  total: number;
  averageNightly: number;
  promoCode: string | null;
}

/** Округление денежной суммы до 2 знаков. */
function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Цена сезонного правила, покрывающего дату (границы включительно). */
function seasonalRateFor(date: string, rates: SeasonalRate[]): number | null {
  for (const rate of rates) {
    if (date >= rate.startDate && date <= rate.endDate) {
      return rate.price;
    }
  }
  return null;
}

/** Ставка за конкретную ночь: сезон > выходной > базовая. */
export function nightlyRate(
  date: string,
  config: NightlyRateConfig,
): { price: number; tier: RateTier } {
  const seasonal = seasonalRateFor(date, config.seasonalRates);
  if (seasonal !== null) {
    return { price: seasonal, tier: "seasonal" };
  }
  if (config.weekendPrice !== null && WEEKEND_DAYS.has(dayOfWeek(date))) {
    return { price: config.weekendPrice, tier: "weekend" };
  }
  return { price: config.defaultPrice, tier: "default" };
}

/**
 * Pricing engine: считает полную стоимость бронирования — посуточная
 * разбивка (база / выходной / сезон), сбор за уборку, налог и скидка по
 * промокоду. Возвратный залог в total не входит (отдельный депозит).
 */
export function buildBookingQuote(input: BookingQuoteInput): BookingQuote {
  const nights = Math.max(0, nightsBetween(input.checkIn, input.checkOut));
  const nightlyBreakdown: QuoteNight[] = [];
  let cursor = input.checkIn;
  for (let index = 0; index < nights; index += 1) {
    const rate = nightlyRate(cursor, input.nightly);
    nightlyBreakdown.push({
      date: cursor,
      price: round2(rate.price),
      tier: rate.tier,
    });
    cursor = addDays(cursor, 1);
  }

  const subtotal = round2(
    nightlyBreakdown.reduce((sum, night) => sum + night.price, 0),
  );
  const cleaningFee = round2(Math.max(0, input.cleaningFee));
  const securityDeposit = round2(Math.max(0, input.securityDeposit));
  const taxes = round2(Math.max(0, input.taxes));
  const grossTotal = subtotal + cleaningFee + taxes;
  // Скидка не может превысить оплачиваемую часть.
  const discount = round2(
    Math.min(Math.max(0, input.promo?.discount ?? 0), grossTotal),
  );
  const total = round2(grossTotal - discount);
  const averageNightly = nights > 0 ? round2(subtotal / nights) : 0;

  return {
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    nights,
    currency: input.currency,
    nightlyBreakdown,
    subtotal,
    cleaningFee,
    securityDeposit,
    taxes,
    discount,
    total,
    averageNightly,
    promoCode: input.promo?.code ?? null,
  };
}

/**
 * Резолв промокода — плейсхолдер. Каталога промокодов пока нет, поэтому
 * функция всегда возвращает null; pricing engine уже умеет учитывать
 * скидку — это чистая точка расширения под будущий каталог.
 */
export function resolvePromoCode(code: string | null): PromoResult | null {
  const trimmed = code?.trim();
  if (!trimmed) {
    return null;
  }
  // TODO(promo): резолвить промокод из каталога организации и считать скидку.
  return null;
}

/** Параметры правил доступности для проверки бронирования. */
export interface StayRulesConfig {
  minStay: number;
  maxStay: number | null;
  checkInDays: number[];
  checkOutDays: number[];
}

/**
 * Проверяет даты на соответствие правилам доступности (минимум/максимум
 * ночей, разрешённые дни заезда и выезда). Возвращает список ошибок.
 */
export function validateStayRules(
  checkIn: string,
  checkOut: string,
  rules: StayRulesConfig,
): string[] {
  const errors: string[] = [];
  const nights = nightsBetween(checkIn, checkOut);

  if (nights < 1) {
    errors.push("Check-out must be after check-in.");
    return errors;
  }
  if (nights < rules.minStay) {
    errors.push(`Minimum stay is ${rules.minStay} night(s).`);
  }
  if (rules.maxStay !== null && nights > rules.maxStay) {
    errors.push(`Maximum stay is ${rules.maxStay} night(s).`);
  }
  if (
    rules.checkInDays.length > 0 &&
    !rules.checkInDays.includes(dayOfWeek(checkIn))
  ) {
    errors.push("Check-in is not available on the selected day.");
  }
  if (
    rules.checkOutDays.length > 0 &&
    !rules.checkOutDays.includes(dayOfWeek(checkOut))
  ) {
    errors.push("Check-out is not available on the selected day.");
  }
  return errors;
}
