import type { MetadataRoute } from "next";

import { slugifyLocation } from "@/features/seo/area-pages";
import { getSitemapData } from "@/features/seo/queries";
import { DEFAULT_LOCALE, LOCALES } from "@/lib/i18n";
import { getSiteUrl } from "@/lib/seo";
import { resolvePublicOrganization } from "@/server/public-site";

export const dynamic = "force-dynamic";

const AREA_SEGMENTS = [
  "homes-for-sale",
  "apartments-for-rent",
  "vacation-rentals",
  "luxury-homes",
];

/**
 * sitemap.xml организации: главная и каталоги, CMS-страницы, объекты,
 * профили агентов, SEO area-страницы. Каждый URL несёт hreflang-альтернативы
 * по всем локалям. Блог добавится сюда отдельным этапом (placeholder).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const entries: MetadataRoute.Sitemap = [];

  const addPage = (
    path: string,
    priority: number,
    lastModified?: string,
  ): void => {
    const languages: Record<string, string> = {};
    for (const locale of LOCALES) {
      languages[locale] = `${siteUrl}/${locale}${path}`;
    }
    entries.push({
      url: `${siteUrl}/${DEFAULT_LOCALE}${path}`,
      lastModified: lastModified ? new Date(lastModified) : new Date(),
      changeFrequency: "weekly",
      priority,
      alternates: { languages },
    });
  };

  // Главная и публичные каталоги.
  addPage("", 1);
  for (const path of [
    "/listings",
    "/buy",
    "/rent",
    "/vacation-rentals",
    "/agents",
  ]) {
    addPage(path, 0.7);
  }

  const organization = await resolvePublicOrganization();
  if (organization) {
    const data = await getSitemapData(organization.id);

    for (const page of data.pages) {
      addPage(`/${page.slug}`, 0.6, page.updatedAt);
    }
    for (const property of data.properties) {
      addPage(`/properties/${property.slug}`, 0.8, property.updatedAt);
    }
    for (const agentId of data.agentIds) {
      addPage(`/agents/${agentId}`, 0.5);
    }
    for (const city of data.cities) {
      const citySlug = slugifyLocation(city);
      for (const segment of AREA_SEGMENTS) {
        addPage(`/${segment}/${citySlug}`, 0.6);
      }
    }
    for (const pair of data.cityAreas) {
      addPage(
        `/homes-for-sale/${slugifyLocation(pair.city)}/${slugifyLocation(pair.area)}`,
        0.5,
      );
    }
  }

  return entries;
}
