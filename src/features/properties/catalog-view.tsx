import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PROPERTY_TYPE_OPTIONS } from "@/features/properties/constants";
import {
  PropertiesCatalog,
  type CatalogItem,
  type DealMode,
} from "@/features/properties/properties-catalog";
import {
  getPublicAmenities,
  getPropertyAmenityNames,
  getPublicProperties,
  type CatalogFilters,
} from "@/features/properties/queries";
import type {
  PropertyPurpose,
  PropertyType,
} from "@/features/properties/types";
import { shouldNoindexSearch } from "@/features/seo/noindex";
import { ROUTES } from "@/lib/constants/routes";
import { isLocale, type Locale } from "@/lib/i18n";
import { buildLocaleAlternates, buildLocalizedPath } from "@/lib/seo";
import { getPublicSiteContext } from "@/server/public-site";

/** Вариант каталога — задаёт начальную сделку, заголовок метаданных и путь. */
export type CatalogVariant = "listings" | "buy" | "rent" | "vacation-rentals";

type Deal = CatalogItem["deal"];

interface VariantConfig {
  title: string;
  description: string;
  path: string;
  initialDeal: DealMode;
}

const VARIANT_CONFIG: Record<CatalogVariant, VariantConfig> = {
  listings: {
    title: "Properties",
    description: "Apartments, villas and investments — vetted personally.",
    path: ROUTES.public.listings,
    // Каталог всегда в контексте одного типа сделки; общий /listings
    // открывается в режиме Buy по умолчанию (дизайн properties v2).
    initialDeal: "sale",
  },
  buy: {
    title: "For sale",
    description: "Find a property to buy in Dubai.",
    path: ROUTES.public.buy,
    initialDeal: "sale",
  },
  rent: {
    title: "For long-term rent",
    description: "Find a long-term rental home in Dubai.",
    path: ROUTES.public.rent,
    initialDeal: "rent",
  },
  "vacation-rentals": {
    title: "Vacation rentals",
    description: "Find a short-term holiday stay in Dubai.",
    path: ROUTES.public.vacationRentals,
    initialDeal: "vacation",
  },
};

type SearchParams = { [key: string]: string | string[] | undefined };

interface CatalogRouteProps {
  params: { locale: string };
  searchParams: SearchParams;
}

function resolveLocale(value: string): Locale {
  return isLocale(value) ? value : "en";
}

/** purpose (БД) → deal (дизайн каталога). */
function purposeToDeal(purpose: PropertyPurpose): Deal {
  if (purpose === "sale") return "sale";
  if (purpose === "long_term_rent") return "rent";
  if (purpose === "short_term_rental") return "vacation";
  return "other";
}

function priceCycle(purpose: PropertyPurpose): string | null {
  if (purpose === "long_term_rent") return "/mo";
  if (purpose === "short_term_rental") return "/night";
  return null;
}

function typeLabel(type: PropertyType): string {
  return (
    PROPERTY_TYPE_OPTIONS.find((option) => option.value === type)?.label ??
    type
  );
}

function formatPrice(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
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
    openGraph: { title, description: config.description },
  };
}

interface RenderCatalogArgs extends CatalogRouteProps {
  variant: CatalogVariant;
}

/**
 * Рендерит каталог объектов в editorial-стиле (новый дизайн properties).
 * Сервер тянет все активные публичные объекты + удобства; фильтрация,
 * сортировка, режимы List/Grid, пагинация — на клиенте (PropertiesCatalog).
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

  // Все активные публичные объекты (без серверной фильтрации — её делает клиент).
  const allFilters: CatalogFilters = {
    purposes: null,
    propertyType: null,
    city: null,
    area: null,
    minPrice: null,
    maxPrice: null,
    bedrooms: null,
    bathrooms: null,
    guests: null,
    amenityIds: [],
    sort: "newest",
    page: 1,
    pageSize: 200,
  };

  const [amenityCatalog, result] = await Promise.all([
    getPublicAmenities(site.organization.id),
    getPublicProperties(
      site.organization.id,
      locale,
      site.organization.default_language,
      allFilters,
    ),
  ]);

  const amenityMap = await getPropertyAmenityNames(
    result.items.map((card) => card.id),
  );

  const items: CatalogItem[] = result.items.map((card) => {
    const visiblePrice =
      card.price && card.price.displayType === "visible" ? card.price : null;
    const sizeForRate = card.size && card.size > 0 ? card.size : null;
    const pricePerAreaText =
      visiblePrice && sizeForRate
        ? `${formatPrice(Math.round(visiblePrice.amount / sizeForRate), visiblePrice.currency)} / ${card.sizeUnit}`
        : null;
    return {
      id: card.id,
      href: buildLocalizedPath(locale, `/properties/${card.slug}`),
      title: card.title,
      deal: purposeToDeal(card.purpose),
      type: typeLabel(card.propertyType),
      district: card.city ?? "Dubai",
      location: card.area ?? card.city ?? "Dubai",
      beds: card.bedrooms ?? 0,
      baths: card.bathrooms ?? 0,
      sqft: card.size,
      sizeUnit: card.sizeUnit,
      sleeps: card.guestCapacity,
      view: card.listingView,
      furnishing: card.furnishing,
      completion: card.completion,
      ownership: card.ownership,
      yield: card.rentalYield,
      tags: card.tags,
      amenities: amenityMap.get(card.id) ?? [],
      badge: card.badge,
      priceVal: visiblePrice ? visiblePrice.amount : null,
      priceDisplay: visiblePrice
        ? formatPrice(visiblePrice.amount, visiblePrice.currency)
        : null,
      priceCycle: visiblePrice ? priceCycle(card.purpose) : null,
      pricePerAreaText,
      img: card.coverImageUrl,
    };
  });

  // ?deal= может переопределить начальную сделку (например, ссылка из меню).
  const dealParam = Array.isArray(searchParams.deal)
    ? searchParams.deal[0]
    : searchParams.deal;
  const initialDeal: DealMode =
    dealParam === "sale" || dealParam === "rent" || dealParam === "vacation"
      ? dealParam
      : config.initialDeal;

  return (
    <PropertiesCatalog
      items={items}
      amenityOptions={amenityCatalog.amenities.map((a) => a.name)}
      initialDeal={initialDeal}
      contactHref={buildLocalizedPath(locale, "/contact")}
    />
  );
}
