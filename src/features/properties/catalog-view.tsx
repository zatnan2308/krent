import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CatalogCityTabs } from "@/features/properties/catalog-city-tabs";
import { CatalogEditorialCards } from "@/features/properties/catalog-editorial-cards";
import { CatalogEditorialPagination } from "@/features/properties/catalog-editorial-pagination";
import { CatalogEditorialSidebar } from "@/features/properties/catalog-editorial-sidebar";
import { PROPERTY_TYPE_OPTIONS } from "@/features/properties/constants";
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
import { ROUTES } from "@/lib/constants/routes";
import { isLocale, type Locale } from "@/lib/i18n";
import { buildLocaleAlternates } from "@/lib/seo";
import { getPublicSiteContext } from "@/server/public-site";

/** Вариант каталога — определяет цели и заголовок. */
export type CatalogVariant = "listings" | "buy" | "rent" | "vacation-rentals";

interface VariantConfig {
  /** Eyebrow над заголовком. */
  eyebrow: string;
  /** Основной serif-заголовок страницы. */
  title: string;
  description: string;
  path: string;
  purposes: PropertyPurpose[] | null;
}

const VARIANT_CONFIG: Record<CatalogVariant, VariantConfig> = {
  listings: {
    eyebrow: "Catalogue · refreshed Monday",
    title: "Properties",
    description: "Apartments, villas and investments — vetted personally.",
    path: ROUTES.public.listings,
    purposes: null,
  },
  buy: {
    eyebrow: "For sale · refreshed Monday",
    title: "For sale",
    description: "Find a property to buy.",
    path: ROUTES.public.buy,
    purposes: ["sale", "mixed"],
  },
  rent: {
    eyebrow: "Long-term rent · refreshed Monday",
    title: "For long-term rent",
    description: "Find a long-term rental home.",
    path: ROUTES.public.rent,
    purposes: ["long_term_rent", "mixed"],
  },
  "vacation-rentals": {
    eyebrow: "Vacation · refreshed weekly",
    title: "Vacation rentals",
    description: "Find a short-term holiday stay.",
    path: ROUTES.public.vacationRentals,
    purposes: ["short_term_rental", "mixed"],
  },
};

const PAGE_SIZE = 12;
const SORT_VALUES: PropertySort[] = ["newest", "price_asc", "price_desc"];

const SORT_LABELS: Record<PropertySort, string> = {
  newest: "Newest first",
  price_asc: "Price ascending",
  price_desc: "Price descending",
};

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
  if (value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.trunc(parsed) : null;
}

function parseNumberParam(value: string | undefined): number | null {
  if (value === undefined) return null;
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

/** Превращает фильтры обратно в QS-строку, опционально с overrides. */
function buildQueryString(
  filters: CatalogFilters,
  page: number,
  override: Partial<{
    propertyType: PropertyType | null;
    city: string | null;
    sort: PropertySort;
    amenityIds: string[];
  }> = {},
): string {
  const eff = { ...filters, ...override };
  const query = new URLSearchParams();
  if (eff.propertyType) query.set("type", eff.propertyType);
  if (eff.city) query.set("city", eff.city);
  if (filters.area) query.set("area", filters.area);
  if (filters.minPrice !== null) query.set("minPrice", String(filters.minPrice));
  if (filters.maxPrice !== null) query.set("maxPrice", String(filters.maxPrice));
  if (filters.bedrooms !== null) query.set("bedrooms", String(filters.bedrooms));
  if (filters.bathrooms !== null) {
    query.set("bathrooms", String(filters.bathrooms));
  }
  if (filters.guests !== null) query.set("guests", String(filters.guests));
  for (const id of eff.amenityIds) query.append("amenities", id);
  if (eff.sort && eff.sort !== "newest") query.set("sort", eff.sort);
  if (page > 1) query.set("page", String(page));
  return query.toString();
}

/** Метаданные страницы каталога. */
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
 * Рендерит каталог в editorial-стиле для всех четырёх маршрутов.
 * Все данные — из Supabase, фильтры — через URL (GET-форма + ссылки).
 */
export async function renderCatalog({
  variant,
  params,
  searchParams,
}: RenderCatalogArgs) {
  const locale = resolveLocale(params.locale);
  const site = await getPublicSiteContext();
  if (!site) notFound();

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
  const hrefWith = (qs: string): string => (qs ? `${formAction}?${qs}` : formAction);
  const buildPaginationHref = (page: number): string =>
    hrefWith(buildQueryString(filters, page));

  // Города для табов — All + реальные города из БД.
  const cityTabs: { label: string; city: string | null; active: boolean }[] = [
    { label: "All", city: null, active: !filters.city },
    ...locations.cities.map((city) => ({
      label: city,
      city,
      active: filters.city === city,
    })),
  ];

  // Sort dropdown options
  const sortHrefs = SORT_VALUES.map((value) => ({
    value,
    label: SORT_LABELS[value],
    href: hrefWith(buildQueryString(filters, 1, { sort: value })),
  }));

  // Applied chips — каждая ссылка убирает свой фильтр (override на null/«»)
  const chips: { label: string; clearHref: string }[] = [];
  if (filters.propertyType) {
    const label = PROPERTY_TYPE_OPTIONS.find(
      (option) => option.value === filters.propertyType,
    )?.label;
    if (label) {
      chips.push({
        label,
        clearHref: hrefWith(
          buildQueryString(filters, 1, { propertyType: null }),
        ),
      });
    }
  }
  if (filters.city) {
    chips.push({
      label: filters.city,
      clearHref: hrefWith(buildQueryString(filters, 1, { city: null })),
    });
  }
  if (filters.bedrooms !== null && filters.bedrooms > 0) {
    chips.push({
      label: `${filters.bedrooms}+ bed`,
      // Очистить bedrooms: формируем QS без bedrooms.
      clearHref: hrefWith(
        buildQueryString({ ...filters, bedrooms: null }, 1),
      ),
    });
  }
  if (filters.bathrooms !== null && filters.bathrooms > 0) {
    chips.push({
      label: `${filters.bathrooms}+ bath`,
      clearHref: hrefWith(
        buildQueryString({ ...filters, bathrooms: null }, 1),
      ),
    });
  }
  if (filters.minPrice !== null || filters.maxPrice !== null) {
    const lo = filters.minPrice !== null ? `$${filters.minPrice}` : "0";
    const hi = filters.maxPrice !== null ? `$${filters.maxPrice}` : "∞";
    chips.push({
      label: `${lo} – ${hi}`,
      clearHref: hrefWith(
        buildQueryString({ ...filters, minPrice: null, maxPrice: null }, 1),
      ),
    });
  }
  for (const amenityId of filters.amenityIds) {
    const amenity = amenityCatalog.amenities.find((a) => a.id === amenityId);
    if (!amenity) continue;
    chips.push({
      label: amenity.name,
      clearHref: hrefWith(
        buildQueryString(filters, 1, {
          amenityIds: filters.amenityIds.filter((id) => id !== amenityId),
        }),
      ),
    });
  }

  return (
    <>
      {/* ============================================================
          PAGE HEADER — eyebrow + big serif title + count + city tabs
          ============================================================ */}
      <section
        style={{
          paddingTop: 140,
          paddingBottom: 56,
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--bg-primary)",
        }}
      >
        <div
          style={{
            maxWidth: "var(--max-w)",
            margin: "0 auto",
            padding: "0 var(--edge-d)",
          }}
        >
          <span className="eyebrow gold">
            <span className="dot" />
            {config.eyebrow}
          </span>

          <div
            style={{
              marginTop: 18,
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: 22,
            }}
          >
            <h1
              className="serif"
              style={{
                fontSize: "clamp(2.5rem, 6vw, 5.25rem)",
                letterSpacing: "-0.04em",
                lineHeight: 0.95,
                fontWeight: 400,
              }}
            >
              {config.title}
            </h1>
            <p
              className="tnum"
              style={{
                fontSize: 16,
                color: "var(--text-secondary)",
                letterSpacing: "-0.005em",
              }}
            >
              {result.total} {result.total === 1 ? "listing" : "listings"}
              {filters.city ? ` in ${filters.city}` : " across four cities"}
              {" · "}
              <span style={{ color: "var(--text-tertiary)" }}>
                Vetted personally before going public
              </span>
            </p>
          </div>

          {/* City tabs — клиентский AJAX-переключатель */}
          {cityTabs.length > 1 ? (
            <CatalogCityTabs action={formAction} tabs={cityTabs} />
          ) : null}
        </div>
      </section>

      {/* ============================================================
          MAIN — sidebar 280px + content
          ============================================================ */}
      <section
        style={{
          maxWidth: "var(--max-w)",
          margin: "0 auto",
          padding: "40px var(--edge-d) 80px",
        }}
      >
        <div
          className="ed-cat-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "280px 1fr",
            gap: 56,
            alignItems: "start",
          }}
        >
          <CatalogEditorialSidebar
            action={formAction}
            filters={filters}
            amenityCatalog={amenityCatalog}
            cities={locations.cities}
            areas={locations.areas}
          />

          <div style={{ minWidth: 0 }}>
            <CatalogEditorialCards
              items={result.items}
              locale={locale}
              totalShown={result.total}
              totalAll={result.total}
              resetHref={formAction}
              appliedChips={chips}
              sort={filters.sort}
              sortHrefs={sortHrefs}
            />

            <CatalogEditorialPagination
              page={result.page}
              totalPages={result.totalPages}
              getHref={buildPaginationHref}
            />
          </div>
        </div>

        <style>{`
          @media (max-width: 1024px) {
            .ed-cat-grid {
              grid-template-columns: 1fr !important;
              gap: 40px !important;
            }
            .ed-sidebar {
              position: static !important;
              max-height: none !important;
              padding-right: 0 !important;
            }
          }
        `}</style>
      </section>
    </>
  );
}
