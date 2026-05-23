import type { Locale, MeasurementSystem } from "@/lib/i18n";

import type { CurrencyCode } from "./config";

/** Период цены: продажа или арендная ставка. */
export type PricePeriod = "sale" | "month" | "week" | "night";

const PERIOD_SUFFIX: Record<PricePeriod, string> = {
  sale: "",
  month: "/mo",
  week: "/wk",
  night: "/night",
};

const SQM_TO_SQFT = 10.7639;

/** Форматирует денежную сумму по локали через Intl.NumberFormat. */
export function formatCurrency(
  amount: number,
  currency: CurrencyCode,
  locale: Locale,
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Форматирует цену с периодом: продажа — без суффикса,
 * аренда — с суффиксом периода (/mo, /wk, /night).
 */
export function formatPrice(
  amount: number,
  currency: CurrencyCode,
  locale: Locale,
  period: PricePeriod = "sale",
): string {
  const formatted = formatCurrency(amount, currency, locale);
  return `${formatted}${PERIOD_SUFFIX[period] ?? ""}`;
}

/**
 * Форматирует площадь в выбранной системе мер.
 * На вход всегда квадратные метры (каноническое хранение).
 */
export function formatArea(
  squareMeters: number,
  system: MeasurementSystem,
  locale: Locale,
): string {
  const value =
    system === "imperial" ? squareMeters * SQM_TO_SQFT : squareMeters;
  const formatted = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(value);
  return system === "imperial" ? `${formatted} sq ft` : `${formatted} m²`;
}
