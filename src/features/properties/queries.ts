import { cache } from "react";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { isLocale, type Locale } from "@/lib/i18n";
import type { LocalizedSlugs } from "@/lib/seo";

import type {
  Amenity,
  AmenityCategory,
  NearbyPlace,
  PriceDisplayType,
  PricePeriod,
  Property,
  PropertyLocation,
  PropertyMedia,
  PropertyPrice,
  PropertyPurpose,
  PropertyType,
  PropertyVideo,
  SizeUnit,
} from "./types";

type SupabaseServerClient = ReturnType<typeof createClient>;

// ---- Типы публичного каталога ---------------------------------

/** Цена для публичного отображения. */
export interface PublicPropertyPrice {
  amount: number;
  currency: string;
  pricePeriod: PricePeriod;
  displayType: PriceDisplayType;
  oldAmount: number | null;
}

/** Карточка объекта в публичном каталоге. */
export interface PublicPropertyCard {
  id: string;
  /** Слаг для ссылки — переведённый для текущей локали либо базовый. */
  slug: string;
  title: string;
  propertyType: PropertyType;
  purpose: PropertyPurpose;
  status: Property["status"];
  bedrooms: number | null;
  bathrooms: number | null;
  guestCapacity: number | null;
  size: number | null;
  sizeUnit: SizeUnit;
  city: string | null;
  area: string | null;
  coverImageUrl: string | null;
  price: PublicPropertyPrice | null;
  agentName: string | null;
  createdAt: string;
}

/** Способ сортировки каталога. */
export type PropertySort = "newest" | "price_asc" | "price_desc";

/** Фильтры публичного каталога (все значения уже провалидированы). */
export interface CatalogFilters {
  /** Набор целей; null — без ограничения по цели. */
  purposes: PropertyPurpose[] | null;
  propertyType: PropertyType | null;
  city: string | null;
  area: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  guests: number | null;
  amenityIds: string[];
  sort: PropertySort;
  page: number;
  pageSize: number;
}

/** Страница результатов каталога. */
export interface PropertyCatalogResult {
  items: PublicPropertyCard[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Полные данные объекта для публичной страницы. */
export interface PublicPropertyView {
  property: Property;
  title: string;
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  baseSlug: string;
  /** Переведённые слаги по локалям — для hreflang и canonical. */
  localizedSlugs: LocalizedSlugs;
  price: PublicPropertyPrice | null;
  fees: {
    securityDeposit: number | null;
    cleaningFee: number | null;
    taxes: number | null;
  };
  location: PropertyLocation | null;
  media: PropertyMedia[];
  videos: PropertyVideo[];
  amenities: { id: string; name: string }[];
  nearbyPlaces: NearbyPlace[];
  agentName: string | null;
}

// ---- Вспомогательные функции ----------------------------------

function toPublicPrice(price: PropertyPrice): PublicPropertyPrice {
  return {
    amount: price.amount,
    currency: price.currency,
    pricePeriod: price.price_period,
    displayType: price.display_type,
    oldAmount: price.old_amount,
  };
}

/** Видимая для сортировки цена объекта или null. */
function priceValue(card: PublicPropertyCard): number | null {
  return card.price && card.price.displayType === "visible"
    ? card.price.amount
    : null;
}

function sortCards(
  cards: PublicPropertyCard[],
  sort: PropertySort,
): PublicPropertyCard[] {
  const sorted = [...cards];
  if (sort === "newest") {
    sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return sorted;
  }
  const direction = sort === "price_asc" ? 1 : -1;
  sorted.sort((a, b) => {
    const left = priceValue(a);
    const right = priceValue(b);
    // Объекты без видимой цены всегда в конце списка.
    if (left === null && right === null) {
      return 0;
    }
    if (left === null) {
      return 1;
    }
    if (right === null) {
      return -1;
    }
    return (left - right) * direction;
  });
  return sorted;
}

/**
 * Резолвит отображаемые имена агентов через сервис-клиент (auth.users).
 * Профильной таблицы пока нет — имя берётся из user_metadata либо email.
 * Любая ошибка проглатывается: каталог работает и без имён.
 */
async function resolveAgentNames(
  agentIds: string[],
): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  const unique = [...new Set(agentIds)];
  if (unique.length === 0) {
    return names;
  }
  try {
    const admin = createAdminClient();
    await Promise.all(
      unique.map(async (id) => {
        const { data } = await admin.auth.admin.getUserById(id);
        const user = data.user;
        if (!user) {
          return;
        }
        const meta = user.user_metadata ?? {};
        const metaName =
          (typeof meta.full_name === "string" && meta.full_name.trim()) ||
          (typeof meta.name === "string" && meta.name.trim()) ||
          "";
        const emailName = user.email ? (user.email.split("@")[0] ?? "") : "";
        const finalName = metaName || emailName;
        if (finalName) {
          names.set(id, finalName);
        }
      }),
    );
  } catch {
    // Сервис-клиент недоступен — продолжаем без имён агентов.
  }
  return names;
}

/**
 * Собирает карточки каталога: подтягивает переводы, цены, медиа и локации
 * для набора объектов. Имена агентов не заполняются (см. resolveAgentNames).
 */
async function composeCards(
  supabase: SupabaseServerClient,
  rows: Property[],
  locale: Locale,
  defaultLocale: string,
): Promise<PublicPropertyCard[]> {
  if (rows.length === 0) {
    return [];
  }
  const ids = rows.map((row) => row.id);
  const [translations, prices, media, locations] = await Promise.all([
    supabase
      .from("property_translations")
      .select("property_id, locale, title, slug_localized")
      .in("property_id", ids),
    supabase
      .from("property_prices")
      .select("*")
      .in("property_id", ids)
      .order("created_at", { ascending: true }),
    supabase
      .from("property_media")
      .select("property_id, url, category, sort_order")
      .in("property_id", ids)
      .order("sort_order", { ascending: true }),
    supabase
      .from("property_locations")
      .select("property_id, city, area")
      .in("property_id", ids),
  ]);

  const translationRows = translations.data ?? [];
  const priceRows = prices.data ?? [];
  const mediaRows = media.data ?? [];
  const locationRows = locations.data ?? [];

  return rows.map((row) => {
    const propTranslations = translationRows.filter(
      (t) => t.property_id === row.id,
    );
    const localized = propTranslations.find((t) => t.locale === locale);
    const fallback = propTranslations.find((t) => t.locale === defaultLocale);
    const price = priceRows.find((p) => p.property_id === row.id) ?? null;
    const location = locationRows.find((l) => l.property_id === row.id);

    const propMedia = mediaRows.filter((m) => m.property_id === row.id);
    const cover =
      propMedia.find((m) => m.category === "cover") ?? propMedia[0];

    return {
      id: row.id,
      slug: localized?.slug_localized ?? row.slug,
      title: localized?.title ?? fallback?.title ?? row.title,
      propertyType: row.property_type,
      purpose: row.purpose,
      status: row.status,
      bedrooms: row.bedrooms,
      bathrooms: row.bathrooms,
      guestCapacity: row.guest_capacity,
      size: row.size,
      sizeUnit: row.size_unit,
      city: location?.city ?? null,
      area: location?.area ?? null,
      coverImageUrl: cover?.url ?? null,
      price: price ? toPublicPrice(price) : null,
      agentName: null,
      createdAt: row.created_at,
    };
  });
}

/** Привязывает имена агентов к карточкам по их объектам. */
async function attachAgents(
  cards: PublicPropertyCard[],
  rows: Property[],
): Promise<PublicPropertyCard[]> {
  const agentIds = rows
    .filter((row) => cards.some((card) => card.id === row.id))
    .map((row) => row.assigned_agent_id)
    .filter((id): id is string => id !== null);
  const names = await resolveAgentNames(agentIds);
  return cards.map((card) => {
    const row = rows.find((item) => item.id === card.id);
    const agentId = row?.assigned_agent_id ?? null;
    return {
      ...card,
      agentName: agentId ? (names.get(agentId) ?? null) : null,
    };
  });
}

// ---- Каталог --------------------------------------------------

/**
 * Публичный каталог объектов организации.
 * Жёстко ограничен активными публичными объектами; кросс-табличные
 * фильтры (город, цена, удобства) и сортировка по цене выполняются
 * в приложении после сбора карточек.
 */
export async function getPublicProperties(
  organizationId: string,
  locale: Locale,
  defaultLocale: string,
  filters: CatalogFilters,
): Promise<PropertyCatalogResult> {
  const supabase = createClient();

  let query = supabase
    .from("properties")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .eq("visibility", "public");

  if (filters.purposes && filters.purposes.length > 0) {
    query = query.in("purpose", filters.purposes);
  }
  if (filters.propertyType) {
    query = query.eq("property_type", filters.propertyType);
  }
  if (filters.bedrooms !== null) {
    query = query.gte("bedrooms", filters.bedrooms);
  }
  if (filters.bathrooms !== null) {
    query = query.gte("bathrooms", filters.bathrooms);
  }
  if (filters.guests !== null) {
    query = query.gte("guest_capacity", filters.guests);
  }

  const { data } = await query
    .order("created_at", { ascending: false })
    .range(0, 9999);
  const rows = data ?? [];

  let cards = await composeCards(supabase, rows, locale, defaultLocale);

  // Фильтр по удобствам: объект должен иметь ВСЕ выбранные удобства.
  if (filters.amenityIds.length > 0) {
    const { data: links } = await supabase
      .from("property_amenities")
      .select("property_id, amenity_id")
      .in(
        "property_id",
        rows.map((row) => row.id),
      );
    const byProperty = new Map<string, Set<string>>();
    for (const link of links ?? []) {
      const owned = byProperty.get(link.property_id) ?? new Set<string>();
      owned.add(link.amenity_id);
      byProperty.set(link.property_id, owned);
    }
    cards = cards.filter((card) => {
      const owned = byProperty.get(card.id);
      return owned
        ? filters.amenityIds.every((id) => owned.has(id))
        : false;
    });
  }

  if (filters.city) {
    cards = cards.filter((card) => card.city === filters.city);
  }
  if (filters.area) {
    cards = cards.filter((card) => card.area === filters.area);
  }
  if (filters.minPrice !== null || filters.maxPrice !== null) {
    cards = cards.filter((card) => {
      if (!card.price || card.price.displayType !== "visible") {
        return false;
      }
      if (filters.minPrice !== null && card.price.amount < filters.minPrice) {
        return false;
      }
      if (filters.maxPrice !== null && card.price.amount > filters.maxPrice) {
        return false;
      }
      return true;
    });
  }

  cards = sortCards(cards, filters.sort);

  const total = cards.length;
  const pageSize = filters.pageSize;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, filters.page), totalPages);
  const start = (page - 1) * pageSize;
  const pageCards = cards.slice(start, start + pageSize);
  const items = await attachAgents(pageCards, rows);

  return { items, total, page, pageSize, totalPages };
}

/** Похожие объекты: та же организация и цель, кроме текущего. */
export async function getSimilarProperties(
  organizationId: string,
  excludePropertyId: string,
  purpose: PropertyPurpose,
  locale: Locale,
  defaultLocale: string,
  limit = 3,
): Promise<PublicPropertyCard[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("properties")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .eq("visibility", "public")
    .eq("purpose", purpose)
    .neq("id", excludePropertyId)
    .order("created_at", { ascending: false })
    .limit(limit);

  const rows = data ?? [];
  const cards = await composeCards(supabase, rows, locale, defaultLocale);
  return attachAgents(cards, rows);
}

// ---- Страница объекта -----------------------------------------

/**
 * Объект для публичной страницы. Резолвится по базовому слагу либо по
 * переведённому slug_localized. Обёрнут в cache(): generateMetadata и
 * сам рендер страницы используют один запрос.
 */
export const getPublicProperty = cache(async function getPublicProperty(
  organizationId: string,
  slug: string,
  locale: Locale,
  defaultLocale: string,
): Promise<PublicPropertyView | null> {
  const supabase = createClient();

  const baseResult = await supabase
    .from("properties")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("slug", slug)
    .eq("status", "active")
    .eq("visibility", "public")
    .maybeSingle();
  let property = baseResult.data;

  if (!property) {
    // Объект мог быть открыт по переведённому слагу.
    const { data: translation } = await supabase
      .from("property_translations")
      .select("property_id")
      .eq("organization_id", organizationId)
      .eq("slug_localized", slug)
      .limit(1)
      .maybeSingle();
    if (translation) {
      const byId = await supabase
        .from("properties")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("id", translation.property_id)
        .eq("status", "active")
        .eq("visibility", "public")
        .maybeSingle();
      property = byId.data;
    }
  }
  if (!property) {
    return null;
  }

  const propertyId = property.id;
  const [translations, price, location, media, videos, amenityLinks, nearby] =
    await Promise.all([
      supabase
        .from("property_translations")
        .select("*")
        .eq("property_id", propertyId),
      supabase
        .from("property_prices")
        .select("*")
        .eq("property_id", propertyId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("property_locations")
        .select("*")
        .eq("property_id", propertyId)
        .maybeSingle(),
      supabase
        .from("property_media")
        .select("*")
        .eq("property_id", propertyId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("property_videos")
        .select("*")
        .eq("property_id", propertyId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("property_amenities")
        .select("amenity_id")
        .eq("property_id", propertyId),
      supabase
        .from("nearby_places")
        .select("*")
        .eq("property_id", propertyId)
        .order("sort_order", { ascending: true }),
    ]);

  const translationRows = translations.data ?? [];
  const localized = translationRows.find((t) => t.locale === locale);
  const fallback = translationRows.find((t) => t.locale === defaultLocale);

  const localizedSlugs: LocalizedSlugs = {};
  for (const translation of translationRows) {
    if (translation.slug_localized && isLocale(translation.locale)) {
      localizedSlugs[translation.locale] = translation.slug_localized;
    }
  }

  const amenityIds = (amenityLinks.data ?? []).map((row) => row.amenity_id);
  let amenities: { id: string; name: string }[] = [];
  if (amenityIds.length > 0) {
    const { data: amenityRows } = await supabase
      .from("amenities")
      .select("id, name")
      .in("id", amenityIds)
      .order("sort_order", { ascending: true });
    amenities = amenityRows ?? [];
  }

  const agentId = property.assigned_agent_id;
  const agentNames = await resolveAgentNames(agentId ? [agentId] : []);
  const priceRow = price.data;

  return {
    property,
    title: localized?.title ?? fallback?.title ?? property.title,
    description: localized?.description ?? fallback?.description ?? null,
    seoTitle: localized?.seo_title ?? fallback?.seo_title ?? null,
    seoDescription:
      localized?.seo_description ?? fallback?.seo_description ?? null,
    baseSlug: property.slug,
    localizedSlugs,
    price: priceRow ? toPublicPrice(priceRow) : null,
    fees: {
      securityDeposit: priceRow?.security_deposit ?? null,
      cleaningFee: priceRow?.cleaning_fee ?? null,
      taxes: priceRow?.taxes ?? null,
    },
    location: location.data,
    media: media.data ?? [],
    videos: videos.data ?? [],
    amenities,
    nearbyPlaces: nearby.data ?? [],
    agentName: agentId ? (agentNames.get(agentId) ?? null) : null,
  };
});

// ---- Справочники для фильтров ---------------------------------

/** Каталог удобств организации: системные + кастомные. */
export async function getPublicAmenities(
  organizationId: string,
): Promise<{ categories: AmenityCategory[]; amenities: Amenity[] }> {
  const supabase = createClient();
  const orgFilter = `organization_id.is.null,organization_id.eq.${organizationId}`;
  const [categories, amenities] = await Promise.all([
    supabase
      .from("amenity_categories")
      .select("*")
      .or(orgFilter)
      .order("sort_order", { ascending: true }),
    supabase
      .from("amenities")
      .select("*")
      .or(orgFilter)
      .order("sort_order", { ascending: true }),
  ]);
  return {
    categories: categories.data ?? [],
    amenities: amenities.data ?? [],
  };
}

/** Уникальные города и районы объектов организации — для фильтров. */
export async function getPublicLocations(
  organizationId: string,
): Promise<{ cities: string[]; areas: string[] }> {
  const supabase = createClient();
  const { data } = await supabase
    .from("property_locations")
    .select("city, area")
    .eq("organization_id", organizationId);

  const cities = new Set<string>();
  const areas = new Set<string>();
  for (const row of data ?? []) {
    if (row.city && row.city.trim() !== "") {
      cities.add(row.city.trim());
    }
    if (row.area && row.area.trim() !== "") {
      areas.add(row.area.trim());
    }
  }
  return {
    cities: [...cities].sort((a, b) => a.localeCompare(b)),
    areas: [...areas].sort((a, b) => a.localeCompare(b)),
  };
}
