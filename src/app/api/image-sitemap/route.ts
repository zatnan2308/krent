import { NextResponse } from "next/server";

import { getSitemapData } from "@/features/seo/queries";
import { DEFAULT_LOCALE } from "@/lib/i18n";
import { getSiteUrl } from "@/lib/seo";
import { resolvePublicOrganization } from "@/server/public-site";

export const dynamic = "force-dynamic";

/** Экранирует значение для XML. */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Image sitemap (placeholder): перечисляет страницы объектов с их
 * обложками. Базовая версия — без подписей и заголовков изображений;
 * расширяется здесь, когда понадобятся caption / title.
 */
export async function GET() {
  const siteUrl = getSiteUrl();
  const organization = await resolvePublicOrganization();

  const blocks: string[] = [];
  if (organization) {
    const data = await getSitemapData(organization.id);
    for (const property of data.properties) {
      if (!property.image) {
        continue;
      }
      const loc = `${siteUrl}/${DEFAULT_LOCALE}/properties/${property.slug}`;
      blocks.push(
        `  <url>\n    <loc>${escapeXml(loc)}</loc>\n` +
          `    <image:image>\n      <image:loc>${escapeXml(property.image)}</image:loc>\n    </image:image>\n` +
          `  </url>`,
      );
    }
  }

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ' +
    'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n' +
    `${blocks.join("\n")}\n` +
    "</urlset>";

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
