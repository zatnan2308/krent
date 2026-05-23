/** Поддерживаемые локали мультиязычной платформы. Список расширяемый. */
export const LOCALES = ["en", "fr", "es", "uk", "ru"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Имя cookie с предпочтённой пользователем локалью. */
export const LOCALE_COOKIE = "krent_locale";

/** Названия локалей на родном языке (для переключателя). */
export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  fr: "Français",
  es: "Español",
  uk: "Українська",
  ru: "Русский",
};

/** Система мер. Совпадает с enum measurement_system в БД. */
export type MeasurementSystem = "metric" | "imperial";

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/** Извлекает локаль из первого сегмента пути ("/ru/about" -> "ru"). */
export function getLocaleFromPathname(pathname: string): Locale | null {
  const segment = pathname.split("/")[1] ?? "";
  return isLocale(segment) ? segment : null;
}

/** Подбирает поддерживаемую локаль по заголовку Accept-Language. */
export function matchLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) {
    return DEFAULT_LOCALE;
  }

  const requested = acceptLanguage
    .split(",")
    .map(
      (part) => part.split(";")[0]?.trim().slice(0, 2).toLowerCase() ?? "",
    );

  for (const code of requested) {
    if (isLocale(code)) {
      return code;
    }
  }

  return DEFAULT_LOCALE;
}
