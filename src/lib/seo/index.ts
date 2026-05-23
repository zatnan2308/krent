import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/lib/i18n";

/**
 * SEO-хелперы для мультиязычных URL.
 *
 * Translated slugs: бизнес-сущности будут хранить slug на каждую локаль
 * (см. тип LocalizedSlugs). Эти хелперы строят URL по уже выбранному
 * для локали слагу — логика выбора слага живёт в модулях сущностей.
 */

/** Слаг сущности по локалям. Заполняется частично; fallback — на default. */
export type LocalizedSlugs = Partial<Record<Locale, string>>;

/**
 * Базовый URL сайта без хвостового слеша.
 *
 * TODO(canonical): для агентских витрин (agent website duplicates) база
 * canonical должна резолвиться по основному домену организации, а не по
 * платформенному NEXT_PUBLIC_SITE_URL. Точка расширения — здесь.
 */
export function getSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return url.replace(/\/+$/, "");
}

/** Нормализует путь: ведущий слеш есть, хвостового нет, "/" -> "". */
function normalizePath(path: string): string {
  const withLeading = path.startsWith("/") ? path : `/${path}`;
  const trimmed = withLeading.replace(/\/+$/, "");
  return trimmed;
}

/** Строит локализованный путь: ("ru", "/properties") -> "/ru/properties". */
export function buildLocalizedPath(locale: Locale, path = "/"): string {
  return `/${locale}${normalizePath(path)}`;
}

/** Абсолютный canonical URL для локали и пути. */
export function buildCanonicalUrl(locale: Locale, path = "/"): string {
  return `${getSiteUrl()}${buildLocalizedPath(locale, path)}`;
}

/**
 * Карта hreflang для metadata.alternates.languages — все локали и x-default.
 * `slugs` позволяет подставить переведённый слаг для конкретной локали.
 */
export function buildAlternateLanguages(
  path = "/",
  slugs?: LocalizedSlugs,
): Record<string, string> {
  const alternates: Record<string, string> = {};

  for (const locale of LOCALES) {
    const localizedPath = slugs?.[locale] ?? path;
    alternates[locale] = buildCanonicalUrl(locale, localizedPath);
  }

  const defaultPath = slugs?.[DEFAULT_LOCALE] ?? path;
  alternates["x-default"] = buildCanonicalUrl(DEFAULT_LOCALE, defaultPath);

  return alternates;
}

/**
 * Готовый блок metadata.alternates для страницы:
 * canonical + языковые версии.
 */
export function buildLocaleAlternates(
  locale: Locale,
  path = "/",
  slugs?: LocalizedSlugs,
): { canonical: string; languages: Record<string, string> } {
  const canonicalPath = slugs?.[locale] ?? path;
  return {
    canonical: buildCanonicalUrl(locale, canonicalPath),
    languages: buildAlternateLanguages(path, slugs),
  };
}
