import type { Tables } from "@/types/database";

import type { PropertySyncSettings } from "./types";

/** Карточка объекта в её базовом представлении для публичного API. */
export interface PublicPropertyShape {
  id: string;
  slug: string;
  title: string;
  status: string;
  propertyType: string;
  purpose: string;
  bedrooms: number | null;
  bathrooms: number | null;
  beds: number | null;
  size: number | null;
  sizeUnit: string;
  yearBuilt: number | null;
  guestCapacity: number | null;
  publishedAt: string | null;
  price: {
    amount: number;
    currency: string;
    period: string;
    cleaningFee: number | null;
    securityDeposit: number | null;
    taxes: number | null;
    oldAmount: number | null;
  } | null;
  location: {
    city: string | null;
    country: string | null;
    area: string | null;
    publicAddress: string | null;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
  media: { url: string; alt: string | null; category: string }[];
  amenities: string[];
  description: string | null;
  agentId: string | null;
  updatedAt: string;
  url: string | null;
}

/** Контекст сериализации: настройки sync + базовый url для ссылок. */
export interface SerializationContext {
  settings: PropertySyncSettings | null;
  baseUrl: string;
}

/**
 * Превращает плотную выборку из БД в безопасный для публикации объект.
 * Все «приватные» поля (точный адрес при скрытом флаге, контакты владельца,
 * комиссия, internal notes) фильтруются.
 */
export function toPublicProperty(input: {
  property: Tables<"properties">;
  location: Tables<"property_locations"> | null;
  price: Tables<"property_prices"> | null;
  media: Tables<"property_media">[];
  amenities: string[];
  description: string | null;
  publishedAt: string | null;
  context: SerializationContext;
}): PublicPropertyShape {
  const { property, location, price, media, amenities, description } = input;
  const hideExact = shouldHideExactAddress(location);
  return {
    id: property.id,
    slug: property.slug,
    title: property.title,
    status: property.status,
    propertyType: property.property_type,
    purpose: property.purpose,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    beds: property.beds,
    size: property.size,
    sizeUnit: property.size_unit,
    yearBuilt: property.year_built,
    guestCapacity: property.guest_capacity,
    publishedAt: input.publishedAt,
    price: price
      ? {
          amount: price.amount,
          currency: price.currency,
          period: price.price_period,
          cleaningFee: price.cleaning_fee,
          securityDeposit: price.security_deposit,
          taxes: price.taxes,
          oldAmount: price.old_amount,
        }
      : null,
    location: location
      ? {
          city: location.city,
          country: location.country,
          area: location.area,
          publicAddress: location.public_address,
          address: hideExact ? null : location.address,
          latitude: hideExact ? null : location.latitude,
          longitude: hideExact ? null : location.longitude,
        }
      : null,
    media: media.map((item) => ({
      url: item.url,
      alt: item.alt,
      category: item.category,
    })),
    amenities,
    description,
    agentId: property.assigned_agent_id,
    updatedAt: property.updated_at,
    url: `${trimTrailingSlash(input.context.baseUrl)}/properties/${property.slug}`,
  };
}

/** Скрываем точный адрес, если флаг exact_address_visibility != "exact". */
function shouldHideExactAddress(
  location: Tables<"property_locations"> | null,
): boolean {
  if (!location) {
    return true;
  }
  return location.exact_address_visibility !== "exact";
}

/** JSON-сериализатор фида (object → JSON.stringify(value, null, 2)). */
export function serializeJsonFeed(items: PublicPropertyShape[]): string {
  return JSON.stringify(
    { count: items.length, items },
    null,
    2,
  );
}

/** XML-сериализатор. Простой ручной writer — без сторонних библиотек. */
export function serializeXmlFeed(items: PublicPropertyShape[]): string {
  const rows = items
    .map((item) => `  <property>\n${xmlForProperty(item)}  </property>`)
    .join("\n");
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<properties count="${items.length}">`,
    rows,
    "</properties>",
  ].join("\n");
}

function xmlForProperty(item: PublicPropertyShape): string {
  const lines: string[] = [
    line("id", item.id),
    line("slug", item.slug),
    line("title", item.title),
    line("status", item.status),
    line("propertyType", item.propertyType),
    line("purpose", item.purpose),
    optional("bedrooms", item.bedrooms),
    optional("bathrooms", item.bathrooms),
    optional("beds", item.beds),
    optional("size", item.size),
    line("sizeUnit", item.sizeUnit),
    optional("yearBuilt", item.yearBuilt),
    optional("guestCapacity", item.guestCapacity),
    optional("publishedAt", item.publishedAt),
    optional("updatedAt", item.updatedAt),
    optional("url", item.url),
    optional("description", item.description),
  ];
  if (item.price) {
    lines.push("    <price>");
    lines.push(line("      amount", item.price.amount));
    lines.push(line("      currency", item.price.currency));
    lines.push(line("      period", item.price.period));
    lines.push(optional("      cleaningFee", item.price.cleaningFee));
    lines.push(optional("      securityDeposit", item.price.securityDeposit));
    lines.push(optional("      taxes", item.price.taxes));
    lines.push("    </price>");
  }
  if (item.location) {
    lines.push("    <location>");
    lines.push(optional("      city", item.location.city));
    lines.push(optional("      country", item.location.country));
    lines.push(optional("      area", item.location.area));
    lines.push(optional("      address", item.location.publicAddress ?? item.location.address));
    lines.push(optional("      latitude", item.location.latitude));
    lines.push(optional("      longitude", item.location.longitude));
    lines.push("    </location>");
  }
  if (item.media.length > 0) {
    lines.push("    <media>");
    for (const m of item.media) {
      lines.push(
        `      <item category="${escapeXml(m.category)}" alt="${escapeXml(m.alt ?? "")}">${escapeXml(m.url)}</item>`,
      );
    }
    lines.push("    </media>");
  }
  if (item.amenities.length > 0) {
    lines.push("    <amenities>");
    for (const amenity of item.amenities) {
      lines.push(`      <amenity>${escapeXml(amenity)}</amenity>`);
    }
    lines.push("    </amenities>");
  }
  return `${lines.filter(Boolean).join("\n")}\n`;
}

function line(tag: string, value: string | number | boolean): string {
  return `    <${tag.trim()}>${escapeXml(String(value))}</${tag.trim()}>`;
}

function optional(
  tag: string,
  value: string | number | boolean | null | undefined,
): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }
  return `    <${tag.trim()}>${escapeXml(String(value))}</${tag.trim()}>`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** CSV-экспорт: фиксированные колонки. */
export function serializeCsvFeed(items: PublicPropertyShape[]): string {
  const header = [
    "id",
    "slug",
    "title",
    "status",
    "property_type",
    "purpose",
    "bedrooms",
    "bathrooms",
    "size",
    "size_unit",
    "price_amount",
    "price_currency",
    "price_period",
    "city",
    "country",
    "area",
    "public_address",
    "url",
    "updated_at",
  ];
  const rows = items.map((item) =>
    [
      item.id,
      item.slug,
      item.title,
      item.status,
      item.propertyType,
      item.purpose,
      item.bedrooms ?? "",
      item.bathrooms ?? "",
      item.size ?? "",
      item.sizeUnit,
      item.price?.amount ?? "",
      item.price?.currency ?? "",
      item.price?.period ?? "",
      item.location?.city ?? "",
      item.location?.country ?? "",
      item.location?.area ?? "",
      item.location?.publicAddress ?? item.location?.address ?? "",
      item.url ?? "",
      item.updatedAt,
    ]
      .map(csvEscape)
      .join(","),
  );
  return [header.join(","), ...rows].join("\n");
}

function csvEscape(value: string | number): string {
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}
