import type {
  AddressVisibility,
  MediaCategory,
  PriceDisplayType,
  PricePeriod,
  PropertyPurpose,
  PropertyStatus,
  PropertyType,
  PropertyVisibility,
  SizeUnit,
  VideoType,
} from "./types";

/** Вариант выбора для select-полей: значение enum + человекочитаемая подпись. */
export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

export const PROPERTY_TYPE_OPTIONS: SelectOption<PropertyType>[] = [
  { value: "apartment", label: "Apartment" },
  { value: "house", label: "House" },
  { value: "villa", label: "Villa" },
  { value: "townhouse", label: "Townhouse" },
  { value: "studio", label: "Studio" },
  { value: "room", label: "Room" },
  { value: "commercial", label: "Commercial" },
  { value: "land", label: "Land" },
  { value: "office", label: "Office" },
];

export const PROPERTY_PURPOSE_OPTIONS: SelectOption<PropertyPurpose>[] = [
  { value: "sale", label: "For sale" },
  { value: "long_term_rent", label: "Long-term rent" },
  { value: "short_term_rental", label: "Short-term rental" },
  { value: "mixed", label: "Sale & rent" },
];

export const PROPERTY_STATUS_OPTIONS: SelectOption<PropertyStatus>[] = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "sold", label: "Sold" },
  { value: "rented", label: "Rented" },
  { value: "archived", label: "Archived" },
  { value: "hidden", label: "Hidden" },
];

export const PROPERTY_VISIBILITY_OPTIONS: SelectOption<PropertyVisibility>[] = [
  { value: "public", label: "Public" },
  { value: "private", label: "Private" },
  { value: "unlisted", label: "Unlisted" },
];

export const PRICE_PERIOD_OPTIONS: SelectOption<PricePeriod>[] = [
  { value: "sale", label: "Sale price" },
  { value: "month", label: "Per month" },
  { value: "week", label: "Per week" },
  { value: "night", label: "Per night" },
];

export const PRICE_DISPLAY_OPTIONS: SelectOption<PriceDisplayType>[] = [
  { value: "visible", label: "Show price" },
  { value: "hidden", label: "Hide price" },
  { value: "upon_request", label: "Price on request" },
];

export const SIZE_UNIT_OPTIONS: SelectOption<SizeUnit>[] = [
  { value: "sqm", label: "m²" },
  { value: "sqft", label: "sq ft" },
];

export const ADDRESS_VISIBILITY_OPTIONS: SelectOption<AddressVisibility>[] = [
  { value: "exact", label: "Show exact address" },
  { value: "approximate", label: "Show approximate area" },
  { value: "hidden", label: "Hide address" },
];

export const MEDIA_CATEGORY_OPTIONS: SelectOption<MediaCategory>[] = [
  { value: "gallery", label: "Gallery" },
  { value: "cover", label: "Cover" },
  { value: "floor_plan", label: "Floor plan" },
];

/** Строит словарь value -> label из списка вариантов. */
function toLabelMap<T extends string>(
  options: SelectOption<T>[],
): Record<T, string> {
  return Object.fromEntries(
    options.map((option) => [option.value, option.label]),
  ) as Record<T, string>;
}

export const PROPERTY_TYPE_LABELS = toLabelMap(PROPERTY_TYPE_OPTIONS);
export const PROPERTY_PURPOSE_LABELS = toLabelMap(PROPERTY_PURPOSE_OPTIONS);
export const PROPERTY_STATUS_LABELS = toLabelMap(PROPERTY_STATUS_OPTIONS);

export const SIZE_UNIT_LABELS: Record<SizeUnit, string> = {
  sqm: "m²",
  sqft: "sq ft",
};

/** Форматирует площадь с единицей измерения объекта. */
export function formatSize(size: number, unit: SizeUnit): string {
  return `${new Intl.NumberFormat("en-US").format(size)} ${SIZE_UNIT_LABELS[unit]}`;
}

export const VIDEO_TYPE_LABELS: Record<VideoType, string> = {
  tour: "Property tour",
  realtor_review: "Agent review",
  virtual_tour: "Virtual tour",
};
