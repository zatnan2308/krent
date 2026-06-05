import { getSiteUrl } from "@/lib/seo";
import { getPublicSiteContext } from "@/server/public-site";

// Зависит от организации (резолвится по домену) → динамический рендер.
export const dynamic = "force-dynamic";

/**
 * robots.txt платформы. Если в seo_settings задан кастомный `robots_txt` —
 * отдаём его как есть (полный override владельцем). Иначе — дефолт: публичный
 * сайт открыт для индексации, внутренние разделы закрыты.
 */
export async function GET(): Promise<Response> {
  const siteUrl = getSiteUrl();
  const site = await getPublicSiteContext();
  const custom = site?.seo?.robots_txt?.trim();

  const body = custom
    ? custom
    : [
        "User-agent: *",
        "Allow: /",
        "Disallow: /dashboard",
        "Disallow: /super-admin",
        "Disallow: /portal",
        "Disallow: /login",
        "Disallow: /api/",
        "",
        `Sitemap: ${siteUrl}/sitemap.xml`,
        `Sitemap: ${siteUrl}/api/image-sitemap`,
        `Host: ${siteUrl}`,
        "",
      ].join("\n");

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
