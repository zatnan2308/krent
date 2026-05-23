import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/seo";

/**
 * robots.txt платформы. Публичный сайт открыт для индексации; внутренние
 * разделы (dashboard, portal, super-admin, login, API) закрыты. URL с
 * фильтрами получают noindex через meta-теги — здесь они не блокируются,
 * чтобы поисковики могли переходить по follow-ссылкам.
 */
export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/super-admin", "/portal", "/login", "/api/"],
    },
    sitemap: [`${siteUrl}/sitemap.xml`, `${siteUrl}/api/image-sitemap`],
    host: siteUrl,
  };
}
