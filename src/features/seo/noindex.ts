type SearchParams = { [key: string]: string | string[] | undefined };

/**
 * Query-параметры, делающие URL непригодным для индексации. Фильтры
 * (цена, сортировка, даты заезда, гости) и служебные параметры дают
 * комбинаторный взрыв адресов — такие страницы исключаются из индекса,
 * чтобы не плодить миллионы индексируемых вариантов фильтров.
 */
const NOINDEX_PARAMS = new Set([
  // ценовые фильтры
  "minprice",
  "maxprice",
  "price",
  // сортировка
  "sort",
  "order",
  // даты бронирования и гости
  "checkin",
  "checkout",
  "guests",
  "adults",
  "children",
  "pets",
  // прочие фильтры каталога
  "type",
  "city",
  "area",
  "bedrooms",
  "bathrooms",
  "amenities",
  // служебные параметры
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
  "ref",
  "session",
  "q",
]);

/** Присутствует ли непустое значение параметра. */
function hasValue(value: string | string[] | undefined): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => item.trim() !== "");
  }
  return value !== undefined && value.trim() !== "";
}

/**
 * Решает, помечать ли URL noindex по его query-параметрам. Пагинация
 * (page) сознательно не входит в список — постраничные URL индексируемы.
 */
export function shouldNoindexSearch(searchParams: SearchParams): boolean {
  for (const key of Object.keys(searchParams)) {
    if (NOINDEX_PARAMS.has(key.toLowerCase()) && hasValue(searchParams[key])) {
      return true;
    }
  }
  return false;
}
