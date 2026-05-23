import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CatalogFilterForm } from "@/features/properties/catalog-filter-form";
import { PROPERTY_TYPE_OPTIONS } from "@/features/properties/constants";
import { PropertyCard } from "@/features/properties/property-card";
import {
  getPublicAmenities,
  getPublicLocations,
  getPublicProperties,
  type CatalogFilters,
  type PropertySort,
} from "@/features/properties/queries";
import type {
  PropertyPurpose,
  PropertyType,
} from "@/features/properties/types";
import { shouldNoindexSearch } from "@/features/seo/noindex";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { ROUTES } from "@/lib/constants/routes";
import { isLocale, type Locale } from "@/lib/i18n";
import { buildLocaleAlternates } from "@/lib/seo";
import { getPublicSiteContext } from "@/server/public-site";

/** Вариант каталога — определяет набор целей и заголовок. */
export type CatalogVariant = "listings" | "buy" | "rent" | "vacation-rentals";

interface VariantConfig {
  title: string;
  description: string;
  path: string;
  purposes: PropertyPurpose[] | null;
}

const VARIANT_CONFIG: Record<CatalogVariant, VariantConfig> = {
  listings: {
    title: "All properties",
    description: "Browse every available property.",
    path: ROUTES.public.listings,
    purposes: null,
  },
  buy: {
    title: "Properties for sale",
    description: "Find a property to buy.",
    path: ROUTES.public.buy,
    purposes: ["sale", "mixed"],
  },
  rent: {
    title: "Long-term rentals",
    description: "Find a long-term rental home.",
    path: ROUTES.public.rent,
    purposes: ["long_term_rent", "mixed"],
  },
  "vacation-rentals": {
    title: "Vacation rentals",
    description: "Find a short-term holiday stay.",
    path: ROUTES.public.vacationRentals,
    purposes: ["short_term_rental", "mixed"],
  },
};

const PAGE_SIZE = 12;
const SORT_VALUES: PropertySort[] = ["newest", "price_asc", "price_desc"];

type SearchParams = { [key: string]: string | string[] | undefined };

interface CatalogRouteProps {
  params: { locale: string };
  searchParams: SearchParams;
}

function resolveLocale(value: string): Locale {
  return isLocale(value) ? value : "en";
}

function firstParam(value: string | string[] | undefined): string | undefined {
  const single = Array.isArray(value) ? value[0] : value;
  return single && single.trim() !== "" ? single.trim() : undefined;
}

function allParams(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) {
    return value.filter((item) => item.trim() !== "");
  }
  return value && value.trim() !== "" ? [value] : [];
}

function parseIntParam(value: string | undefined): number | null {
  if (value === undefined) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.trunc(parsed) : null;
}

function parseNumberParam(value: string | undefined): number | null {
  if (value === undefined) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function parsePropertyType(value: string | undefined): PropertyType | null {
  return PROPERTY_TYPE_OPTIONS.some((option) => option.value === value)
    ? (value as PropertyType)
    : null;
}

function parseSort(value: string | undefined): PropertySort {
  return SORT_VALUES.includes(value as PropertySort)
    ? (value as PropertySort)
    : "newest";
}

function parseFilters(
  searchParams: SearchParams,
  purposes: PropertyPurpose[] | null,
): CatalogFilters {
  const pageRaw = parseIntParam(firstParam(searchParams.page));
  return {
    purposes,
    propertyType: parsePropertyType(firstParam(searchParams.type)),
    city: firstParam(searchParams.city) ?? null,
    area: firstParam(searchParams.area) ?? null,
    minPrice: parseNumberParam(firstParam(searchParams.minPrice)),
    maxPrice: parseNumberParam(firstParam(searchParams.maxPrice)),
    bedrooms: parseIntParam(firstParam(searchParams.bedrooms)),
    bathrooms: parseNumberParam(firstParam(searchParams.bathrooms)),
    guests: parseIntParam(firstParam(searchParams.guests)),
    amenityIds: allParams(searchParams.amenities),
    sort: parseSort(firstParam(searchParams.sort)),
    page: pageRaw && pageRaw > 0 ? pageRaw : 1,
    pageSize: PAGE_SIZE,
  };
}

/** Чистая query-строка для ссылок пагинации. */
function buildQueryString(filters: CatalogFilters, page: number): string {
  const query = new URLSearchParams();
  if (filters.propertyType) {
    query.set("type", filters.propertyType);
  }
  if (filters.city) {
    query.set("city", filters.city);
  }
  if (filters.area) {
    query.set("area", filters.area);
  }
  if (filters.minPrice !== null) {
    query.set("minPrice", String(filters.minPrice));
  }
  if (filters.maxPrice !== null) {
    query.set("maxPrice", String(filters.maxPrice));
  }
  if (filters.bedrooms !== null) {
    query.set("bedrooms", String(filters.bedrooms));
  }
  if (filters.bathrooms !== null) {
    query.set("bathrooms", String(filters.bathrooms));
  }
  if (filters.guests !== null) {
    query.set("guests", String(filters.guests));
  }
  for (const id of filters.amenityIds) {
    query.append("amenities", id);
  }
  if (filters.sort !== "newest") {
    query.set("sort", filters.sort);
  }
  if (page > 1) {
    query.set("page", String(page));
  }
  return query.toString();
}

/** Метаданные страницы каталога: canonical, hreflang, noindex при фильтрах. */
export async function buildCatalogMetadata(
  variant: CatalogVariant,
  { params, searchParams }: CatalogRouteProps,
): Promise<Metadata> {
  const locale = resolveLocale(params.locale);
  const config = VARIANT_CONFIG[variant];
  const site = await getPublicSiteContext();
  const title = site
    ? `${config.title} — ${site.organization.name}`
    : config.title;

  return {
    title,
    description: config.description,
    alternates: buildLocaleAlternates(locale, config.path),
    // Фильтры и служебные параметры дают взрыв URL — такие страницы
    // исключаются из индекса (follow сохраняется).
    robots: shouldNoindexSearch(searchParams)
      ? { index: false, follow: true }
      : undefined,
    openGraph: {
      title,
      description: config.description,
    },
  };
}

interface RenderCatalogArgs extends CatalogRouteProps {
  variant: CatalogVariant;
}

/**
 * Рендерит каталог для всех четырёх маршрутов. Вызывается как функция из
 * async-страниц (не как JSX-компонент) — так типы React 18 не спотыкаются
 * на async-компоненте в JSX.
 */
export async function renderCatalog({
  variant,
  params,
  searchParams,
}: RenderCatalogArgs) {
  const locale = resolveLocale(params.locale);
  const site = await getPublicSiteContext();
  if (!site) {
    notFound();
  }

  const config = VARIANT_CONFIG[variant];
  const filters = parseFilters(searchParams, config.purposes);

  const [amenityCatalog, locations, result] = await Promise.all([
    getPublicAmenities(site.organization.id),
    getPublicLocations(site.organization.id),
    getPublicProperties(
      site.organization.id,
      locale,
      site.organization.default_language,
      filters,
    ),
  ]);

  const formAction = `/${locale}${config.path}`;
  const buildHref = (page: number): string => {
    const queryString = buildQueryString(filters, page);
    return queryString ? `${formAction}?${queryString}` : formAction;
  };

  return (
    <section className="container space-y-8 py-12">
      <header>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {config.title}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {result.total} {result.total === 1 ? "property" : "properties"}{" "}
          available.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <CatalogFilterForm
          action={formAction}
          filters={filters}
          amenityCatalog={amenityCatalog}
          cities={locations.cities}
          areas={locations.areas}
        />

        <div className="space-y-6">
          {result.items.length > 0 ? (
            <>
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {result.items.map((card) => (
                  <PropertyCard key={card.id} card={card} locale={locale} />
                ))}
              </div>
              <Pagination
                page={result.page}
                totalPages={result.totalPages}
                getHref={buildHref}
              />
            </>
          ) : (
            <EmptyState
              title="No properties found"
              description="Try adjusting or resetting the filters."
            />
          )}
        </div>
      </div>
    </section>
  );
}
