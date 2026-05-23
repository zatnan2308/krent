import { createAdminClient } from "@/lib/supabase/server";

// ---- Данные для sitemap ---------------------------------------

export interface SitemapData {
  pages: { slug: string; updatedAt: string }[];
  properties: { slug: string; updatedAt: string; image: string | null }[];
  agentIds: string[];
  cities: string[];
  cityAreas: { city: string; area: string }[];
}

/** Собирает данные организации для генерации sitemap. */
export async function getSitemapData(
  organizationId: string,
): Promise<SitemapData> {
  const admin = createAdminClient();
  const [pagesResult, propertiesResult, locationsResult] = await Promise.all([
    admin
      .from("pages")
      .select("slug, type, status, updated_at")
      .eq("organization_id", organizationId)
      .eq("status", "published"),
    admin
      .from("properties")
      .select("id, slug, updated_at, assigned_agent_id")
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .eq("visibility", "public"),
    admin
      .from("property_locations")
      .select("city, area")
      .eq("organization_id", organizationId),
  ]);

  const pages = (pagesResult.data ?? [])
    .filter((row) => row.type !== "home")
    .map((row) => ({ slug: row.slug, updatedAt: row.updated_at }));

  const propertyRows = propertiesResult.data ?? [];
  const propertyIds = propertyRows.map((row) => row.id);
  const coverImages = new Map<string, string>();
  if (propertyIds.length > 0) {
    const { data: media } = await admin
      .from("property_media")
      .select("property_id, url, category, sort_order")
      .in("property_id", propertyIds)
      .order("sort_order", { ascending: true });
    for (const item of media ?? []) {
      const current = coverImages.get(item.property_id);
      if (!current || item.category === "cover") {
        coverImages.set(item.property_id, item.url);
      }
    }
  }

  const properties = propertyRows.map((row) => ({
    slug: row.slug,
    updatedAt: row.updated_at,
    image: coverImages.get(row.id) ?? null,
  }));

  const agentIds = [
    ...new Set(
      propertyRows
        .map((row) => row.assigned_agent_id)
        .filter((id): id is string => id !== null),
    ),
  ];

  const cities = new Set<string>();
  const cityAreas = new Map<string, { city: string; area: string }>();
  for (const row of locationsResult.data ?? []) {
    const city = row.city?.trim();
    if (!city) {
      continue;
    }
    cities.add(city);
    const area = row.area?.trim();
    if (area) {
      cityAreas.set(`${city}|${area}`, { city, area });
    }
  }

  return {
    pages,
    properties,
    agentIds,
    cities: [...cities],
    cityAreas: [...cityAreas.values()],
  };
}

// ---- SEO-аудит ------------------------------------------------

export interface SeoAuditEntry {
  label: string;
}

export interface DuplicateEntry {
  value: string;
  count: number;
}

export interface SeoAudit {
  pagesMissingTitle: SeoAuditEntry[];
  pagesMissingDescription: SeoAuditEntry[];
  propertiesMissingAlt: SeoAuditEntry[];
  duplicateTitles: DuplicateEntry[];
  duplicateDescriptions: DuplicateEntry[];
  noindexPages: SeoAuditEntry[];
  publishedPages: number;
  activeProperties: number;
}

/** Находит значения, встречающиеся более одного раза. */
function findDuplicates(values: string[]): DuplicateEntry[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([value, count]) => ({ value, count }));
}

/** Аудит SEO-полей страниц и объектов организации. */
export async function getSeoAudit(
  organizationId: string,
): Promise<SeoAudit> {
  const admin = createAdminClient();
  const [pagesResult, propertiesResult, pageTrResult, propertyTrResult] =
    await Promise.all([
      admin
        .from("pages")
        .select("id, slug, status")
        .eq("organization_id", organizationId),
      admin
        .from("properties")
        .select("id, title, status, visibility")
        .eq("organization_id", organizationId),
      admin
        .from("page_translations")
        .select("page_id, seo_title, seo_description")
        .eq("organization_id", organizationId),
      admin
        .from("property_translations")
        .select("property_id, seo_title, seo_description")
        .eq("organization_id", organizationId),
    ]);

  const pages = pagesResult.data ?? [];
  const properties = propertiesResult.data ?? [];
  const pageTr = pageTrResult.data ?? [];
  const propertyTr = propertyTrResult.data ?? [];

  const publishedPages = pages.filter((row) => row.status === "published");
  const activeProperties = properties.filter(
    (row) => row.status === "active" && row.visibility === "public",
  );

  // Аудит страниц.
  const pagesMissingTitle: SeoAuditEntry[] = [];
  const pagesMissingDescription: SeoAuditEntry[] = [];
  for (const page of publishedPages) {
    const translations = pageTr.filter((row) => row.page_id === page.id);
    const hasTitle = translations.some(
      (row) => (row.seo_title ?? "").trim() !== "",
    );
    const hasDescription = translations.some(
      (row) => (row.seo_description ?? "").trim() !== "",
    );
    if (!hasTitle) {
      pagesMissingTitle.push({ label: `/${page.slug}` });
    }
    if (!hasDescription) {
      pagesMissingDescription.push({ label: `/${page.slug}` });
    }
  }

  // Черновики не индексируются — выводим как noindex-страницы.
  const noindexPages: SeoAuditEntry[] = pages
    .filter((row) => row.status !== "published")
    .map((row) => ({ label: `/${row.slug} (${row.status})` }));

  // Аудит alt-текстов объектов.
  const propertiesMissingAlt: SeoAuditEntry[] = [];
  const activeIds = activeProperties.map((row) => row.id);
  if (activeIds.length > 0) {
    const { data: media } = await admin
      .from("property_media")
      .select("property_id, alt")
      .in("property_id", activeIds);
    const missing = new Set<string>();
    for (const item of media ?? []) {
      if ((item.alt ?? "").trim() === "") {
        missing.add(item.property_id);
      }
    }
    for (const property of activeProperties) {
      if (missing.has(property.id)) {
        propertiesMissingAlt.push({ label: property.title });
      }
    }
  }

  // Дубликаты title / description по страницам и объектам.
  const titles: string[] = [];
  const descriptions: string[] = [];
  for (const row of [...pageTr, ...propertyTr]) {
    const title = (row.seo_title ?? "").trim();
    if (title) {
      titles.push(title);
    }
    const description = (row.seo_description ?? "").trim();
    if (description) {
      descriptions.push(description);
    }
  }

  return {
    pagesMissingTitle,
    pagesMissingDescription,
    propertiesMissingAlt,
    duplicateTitles: findDuplicates(titles),
    duplicateDescriptions: findDuplicates(descriptions),
    noindexPages,
    publishedPages: publishedPages.length,
    activeProperties: activeProperties.length,
  };
}
