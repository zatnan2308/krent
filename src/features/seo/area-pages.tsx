import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PropertyCard } from "@/features/properties/property-card";
import {
  getPublicLocations,
  getPublicProperties,
  type CatalogFilters,
} from "@/features/properties/queries";
import type {
  PropertyPurpose,
  PropertyType,
} from "@/features/properties/types";
import { EmptyState } from "@/components/ui/empty-state";
import { isLocale, type Locale } from "@/lib/i18n";
import { buildCanonicalUrl, buildLocaleAlternates } from "@/lib/seo";
import { getPublicSiteContext } from "@/server/public-site";

import { JsonLd } from "./json-ld";
import { breadcrumbJsonLd, faqJsonLd } from "./jsonld";

export type AreaPageType =
  | "homes-for-sale"
  | "apartments-for-rent"
  | "vacation-rentals"
  | "luxury-homes";

interface AreaTypeConfig {
  segment: string;
  noun: string;
  purposes: PropertyPurpose[];
  propertyType: PropertyType | null;
  sort: CatalogFilters["sort"];
}

/** Конфигурация пяти SEO area-страниц. */
const AREA_TYPES: Record<AreaPageType, AreaTypeConfig> = {
  "homes-for-sale": {
    segment: "homes-for-sale",
    noun: "Homes for sale",
    purposes: ["sale", "mixed"],
    propertyType: null,
    sort: "newest",
  },
  "apartments-for-rent": {
    segment: "apartments-for-rent",
    noun: "Apartments for rent",
    purposes: ["long_term_rent", "mixed"],
    propertyType: "apartment",
    sort: "newest",
  },
  "vacation-rentals": {
    segment: "vacation-rentals",
    noun: "Vacation rentals",
    purposes: ["short_term_rental", "mixed"],
    propertyType: null,
    sort: "newest",
  },
  "luxury-homes": {
    segment: "luxury-homes",
    noun: "Luxury homes",
    purposes: ["sale", "mixed"],
    propertyType: null,
    sort: "price_desc",
  },
};

/** Слаг локации: "Downtown Dubai" -> "downtown-dubai". */
export function slugifyLocation(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function resolveLocale(value: string): Locale {
  return isLocale(value) ? value : "en";
}

interface ResolvedLocation {
  city: string;
  area: string | null;
}

/** Резолвит город (и при наличии — район) по их слагам. */
async function resolveLocation(
  organizationId: string,
  citySlug: string,
  areaSlug?: string,
): Promise<ResolvedLocation | null> {
  const locations = await getPublicLocations(organizationId);
  const city = locations.cities.find(
    (item) => slugifyLocation(item) === citySlug,
  );
  if (!city) {
    return null;
  }
  if (areaSlug) {
    const area = locations.areas.find(
      (item) => slugifyLocation(item) === areaSlug,
    );
    if (!area) {
      return null;
    }
    return { city, area };
  }
  return { city, area: null };
}

/** Метаданные area-страницы: title, description, canonical, hreflang. */
export async function buildAreaMetadata(
  type: AreaPageType,
  localeParam: string,
  citySlug: string,
  areaSlug?: string,
): Promise<Metadata> {
  const locale = resolveLocale(localeParam);
  const config = AREA_TYPES[type];
  const site = await getPublicSiteContext();
  if (!site) {
    return {};
  }
  const resolved = await resolveLocation(
    site.organization.id,
    citySlug,
    areaSlug,
  );
  if (!resolved) {
    return {};
  }
  const place = resolved.area
    ? `${resolved.area}, ${resolved.city}`
    : resolved.city;
  const title = `${config.noun} in ${place} — ${site.organization.name}`;
  const description = `Browse ${config.noun.toLowerCase()} in ${place}. Up-to-date listings from ${site.organization.name}.`;
  const path = areaSlug
    ? `/${config.segment}/${citySlug}/${areaSlug}`
    : `/${config.segment}/${citySlug}`;
  return {
    title,
    description,
    alternates: buildLocaleAlternates(locale, path),
    openGraph: { title, description },
  };
}

/** Рендерит SEO area-страницу: листинги объектов, breadcrumb и FAQ. */
export async function renderAreaPage(
  type: AreaPageType,
  localeParam: string,
  citySlug: string,
  areaSlug?: string,
) {
  const locale = resolveLocale(localeParam);
  const config = AREA_TYPES[type];
  const site = await getPublicSiteContext();
  if (!site) {
    notFound();
  }
  const resolved = await resolveLocation(
    site.organization.id,
    citySlug,
    areaSlug,
  );
  if (!resolved) {
    notFound();
  }

  const filters: CatalogFilters = {
    purposes: config.purposes,
    propertyType: config.propertyType,
    city: resolved.city,
    area: resolved.area,
    minPrice: null,
    maxPrice: null,
    bedrooms: null,
    bathrooms: null,
    guests: null,
    amenityIds: [],
    sort: config.sort,
    page: 1,
    pageSize: 24,
  };
  const result = await getPublicProperties(
    site.organization.id,
    locale,
    site.organization.default_language,
    filters,
  );

  const place = resolved.area
    ? `${resolved.area}, ${resolved.city}`
    : resolved.city;
  const heading = `${config.noun} in ${place}`;
  const nounLower = config.noun.toLowerCase();
  const path = areaSlug
    ? `/${config.segment}/${citySlug}/${areaSlug}`
    : `/${config.segment}/${citySlug}`;

  const breadcrumb: { name: string; url: string }[] = [
    { name: "Home", url: buildCanonicalUrl(locale, "/") },
  ];
  if (areaSlug) {
    breadcrumb.push({
      name: `${config.noun} in ${resolved.city}`,
      url: buildCanonicalUrl(locale, `/${config.segment}/${citySlug}`),
    });
  }
  breadcrumb.push({ name: heading, url: buildCanonicalUrl(locale, path) });

  const faqs = [
    {
      question: `How many ${nounLower} are available in ${place}?`,
      answer: `There are currently ${result.total} ${nounLower} listed in ${place} by ${site.organization.name}.`,
    },
    {
      question: `Who can help me with ${nounLower} in ${place}?`,
      answer: `${site.organization.name} can guide you through ${nounLower} in ${place} from the first enquiry to closing.`,
    },
  ];

  return (
    <section className="container space-y-8 py-12">
      <JsonLd data={[breadcrumbJsonLd(breadcrumb), faqJsonLd(faqs)]} />

      <header>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {heading}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {result.total} {result.total === 1 ? "property" : "properties"}{" "}
          available in {place}.
        </p>
      </header>

      {result.items.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {result.items.map((card) => (
            <PropertyCard key={card.id} card={card} locale={locale} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No properties yet"
          description={`There are no ${nounLower} in ${place} right now. Check back soon.`}
        />
      )}

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">
          Frequently asked questions
        </h2>
        <dl className="space-y-3">
          {faqs.map((faq) => (
            <div key={faq.question} className="rounded-lg border p-4">
              <dt className="font-medium">{faq.question}</dt>
              <dd className="mt-1 text-sm text-muted-foreground">
                {faq.answer}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </section>
  );
}
