import type { Metadata } from "next";

import type { Locale } from "@/lib/i18n";
import { buildLocaleAlternates } from "@/lib/seo";
import type { PublicSiteContext } from "@/server/public-site";

import type { ResolvedPage } from "./queries";

/**
 * Строит метаданные страницы из перевода и SEO-настроек организации.
 * Приоритет: поля перевода -> дефолты seo_settings -> без значения.
 */
export function buildPageMetadata(
  resolved: ResolvedPage,
  site: PublicSiteContext,
  locale: Locale,
  path: string,
): Metadata {
  const baseTitle =
    resolved.translation.seo_title ?? resolved.translation.title;
  const suffix = site.seo?.title_suffix ?? "";
  const title = `${baseTitle}${suffix}`;

  const description =
    resolved.translation.seo_description ??
    site.seo?.default_description ??
    undefined;

  const ogImage =
    resolved.translation.og_image_url ??
    site.seo?.default_og_image_url ??
    undefined;

  return {
    title,
    description,
    alternates: buildLocaleAlternates(locale, path),
    openGraph: {
      title,
      description,
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
  };
}
