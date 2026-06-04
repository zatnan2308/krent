import { z } from "zod";

import { CURRENCIES } from "@/lib/currency/config";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Значения enum дублируются здесь как литеральные кортежи: типизированный
// Supabase-клиент в server actions поймает любое расхождение со схемой БД.
const PROPERTY_TYPE_VALUES = [
  "apartment",
  "house",
  "villa",
  "townhouse",
  "studio",
  "room",
  "commercial",
  "land",
  "office",
] as const;
const PURPOSE_VALUES = [
  "sale",
  "long_term_rent",
  "short_term_rental",
  "mixed",
] as const;
const STATUS_VALUES = [
  "draft",
  "active",
  "pending",
  "sold",
  "rented",
  "archived",
  "hidden",
] as const;
const VISIBILITY_VALUES = ["public", "private", "unlisted"] as const;
const PRICE_PERIOD_VALUES = ["sale", "month", "week", "night"] as const;
const PRICE_DISPLAY_VALUES = ["visible", "hidden", "upon_request"] as const;
const SIZE_UNIT_VALUES = ["sqm", "sqft"] as const;
const ADDRESS_VISIBILITY_VALUES = ["exact", "approximate", "hidden"] as const;

const intOrNull = z.number().int().nonnegative().nullable();
const amountOrNull = z.number().nonnegative().nullable();

/** Схема минимальной формы создания объекта. */
export const createPropertySchema = z.object({
  title: z.string().min(1).max(200),
  propertyType: z.enum(PROPERTY_TYPE_VALUES),
  purpose: z.enum(PURPOSE_VALUES),
});
export type CreatePropertyInput = z.infer<typeof createPropertySchema>;

/** Цена объекта. null — у объекта пока нет цены. */
const priceSchema = z.object({
  amount: z.number().nonnegative(),
  currency: z.enum(CURRENCIES),
  pricePeriod: z.enum(PRICE_PERIOD_VALUES),
  displayType: z.enum(PRICE_DISPLAY_VALUES),
  oldAmount: amountOrNull,
  securityDeposit: amountOrNull,
  cleaningFee: amountOrNull,
  taxes: amountOrNull,
});

/** Адрес и геопозиция объекта. */
const locationSchema = z.object({
  country: z.string().max(120).nullable(),
  city: z.string().max(120).nullable(),
  area: z.string().max(120).nullable(),
  address: z.string().max(300).nullable(),
  publicAddress: z.string().max(300).nullable(),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  exactAddressVisibility: z.enum(ADDRESS_VISIBILITY_VALUES),
});

/** Схема полной формы редактирования объекта со всеми вкладками. */
export const updatePropertySchema = z.object({
  id: z.uuid(),
  title: z.string().min(1).max(200),
  slug: z
    .string()
    .regex(SLUG_PATTERN, "Use lowercase letters, numbers and dashes."),
  description: z.string().max(8000).nullable(),
  propertyType: z.enum(PROPERTY_TYPE_VALUES),
  purpose: z.enum(PURPOSE_VALUES),
  status: z.enum(STATUS_VALUES),
  visibility: z.enum(VISIBILITY_VALUES),
  seoTitle: z.string().max(200).nullable(),
  seoDescription: z.string().max(400).nullable(),
  bedrooms: intOrNull,
  bathrooms: amountOrNull,
  beds: intOrNull,
  guestCapacity: intOrNull,
  size: amountOrNull,
  sizeUnit: z.enum(SIZE_UNIT_VALUES),
  lotSize: amountOrNull,
  floor: z.number().int().nullable(),
  totalFloors: intOrNull,
  yearBuilt: intOrNull,
  parking: intOrNull,
  garage: z.boolean(),
  // Каталожные атрибуты (фильтры /properties).
  listingView: z.string().max(60).nullable(),
  furnishing: z.string().max(40).nullable(),
  completion: z.string().max(60).nullable(),
  ownership: z.string().max(40).nullable(),
  rentalYield: z.number().nonnegative().max(100).nullable(),
  lifestyleTags: z.array(z.string().trim().min(1).max(40)).max(12),
  badge: z.string().max(40).nullable(),
  price: priceSchema.nullable(),
  /** Вторая цена — аренда для объектов «Sale & rent» (mixed). */
  rentPrice: priceSchema.nullable().default(null),
  location: locationSchema,
  amenityIds: z.array(z.uuid()),
});
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;

/** Результат server action без возвращаемых данных. */
export type ActionResult = { ok: true } | { ok: false; error: string };

/** Результат server action, создающего запись с идентификатором. */
export type SaveResult =
  | { ok: true; id: string }
  | { ok: false; error: string };
