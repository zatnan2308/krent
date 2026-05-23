/** Поддерживаемые валюты мультивалютной платформы. Список расширяемый. */
export const CURRENCIES = ["USD", "EUR", "GBP", "UAH", "RUB", "AED"] as const;

export type CurrencyCode = (typeof CURRENCIES)[number];

export const DEFAULT_CURRENCY: CurrencyCode = "USD";

/** Имя cookie с выбранной валютой отображения. */
export const CURRENCY_COOKIE = "krent_currency";

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
}

export const CURRENCY_CONFIG: Record<CurrencyCode, CurrencyConfig> = {
  USD: { code: "USD", symbol: "$", name: "US Dollar" },
  EUR: { code: "EUR", symbol: "€", name: "Euro" },
  GBP: { code: "GBP", symbol: "£", name: "British Pound" },
  UAH: { code: "UAH", symbol: "₴", name: "Ukrainian Hryvnia" },
  RUB: { code: "RUB", symbol: "₽", name: "Russian Ruble" },
  AED: { code: "AED", symbol: "AED", name: "UAE Dirham" },
};

export function isCurrencyCode(value: string): value is CurrencyCode {
  return (CURRENCIES as readonly string[]).includes(value);
}
