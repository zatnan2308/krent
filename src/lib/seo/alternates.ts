import { DEFAULT_LOCALE, isLocale, LOCALES, type Locale } from "@/lib/i18n";
import { buildCanonicalUrl, type LocalizedSlugs } from "@/lib/seo";
import { getPublicSiteContext } from "@/server/public-site";

/**
 * SERVER-ONLY. hreflang/canonical с учётом включённых языков организации.
 *
 * Импортирует `getPublicSiteContext` (→ next/headers + admin-клиент), поэтому
 * НЕ должен попадать в клиентский бандл. Чистые sync-хелперы URL живут в
 * `@/lib/seo`; здесь — только org-зависимая async-логика hreflang.
 */

/**
 * Языки для hreflang: включённые языки организации + гарантированный основной.
 * Если организация не резолвится (неизвестный домен, локальная разработка) —
 * откат на весь каталог LOCALES (как было до мультиарендной фильтрации).
 */
async function resolveLocaleConfig(): Promise<{
  locales: Locale[];
  primary: Locale;
}> {
  const site = await getPublicSiteContext();
  const primary =
    site && isLocale(site.organization.default_language)
      ? site.organization.default_language
      : DEFAULT_LOCALE;
  const enabled = (site?.organization.enabled_languages ?? []).filter(isLocale);
  if (enabled.length === 0) {
    return { locales: [...LOCALES], primary: DEFAULT_LOCALE };
  }
  // Основной язык обязан присутствовать (в БД есть constraint, но страхуемся).
  if (!enabled.includes(primary)) {
    enabled.push(primary);
  }
  return { locales: enabled, primary };
}

/**
 * Готовый блок metadata.alternates: canonical текущей локали + hreflang только
 * по включённым языкам организации; x-default указывает на основной язык.
 * `slugs` подставляет переведённый слаг для конкретной локали (объекты/страницы).
 */
export async function buildLocaleAlternates(
  locale: Locale,
  path = "/",
  slugs?: LocalizedSlugs,
): Promise<{ canonical: string; languages: Record<string, string> }> {
  const { locales, primary } = await resolveLocaleConfig();

  const languages: Record<string, string> = {};
  for (const loc of locales) {
    languages[loc] = buildCanonicalUrl(loc, slugs?.[loc] ?? path);
  }
  languages["x-default"] = buildCanonicalUrl(primary, slugs?.[primary] ?? path);

  return {
    canonical: buildCanonicalUrl(locale, slugs?.[locale] ?? path),
    languages,
  };
}
