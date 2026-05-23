import Link from "next/link";

import { PROPERTY_TYPE_OPTIONS } from "@/features/properties/constants";
import type { CatalogFilters } from "@/features/properties/queries";
import type { Amenity, AmenityCategory } from "@/features/properties/types";
import { buttonVariants } from "@/components/ui/button";

const FIELD_CLASS =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];

const MIN_COUNTS = [1, 2, 3, 4, 5];

function numberValue(value: number | null): string {
  return value === null ? "" : String(value);
}

interface CatalogFilterFormProps {
  action: string;
  filters: CatalogFilters;
  amenityCatalog: { categories: AmenityCategory[]; amenities: Amenity[] };
  cities: string[];
  areas: string[];
}

/**
 * Серверная форма фильтров каталога. Работает без клиентского JS:
 * GET-сабмит формирует query-параметры, страница парсит их заново.
 */
export function CatalogFilterForm({
  action,
  filters,
  amenityCatalog,
  cities,
  areas,
}: CatalogFilterFormProps) {
  const categoryIds = new Set(amenityCatalog.categories.map((c) => c.id));
  const groups = amenityCatalog.categories
    .map((category) => ({
      category,
      items: amenityCatalog.amenities.filter(
        (amenity) => amenity.category_id === category.id,
      ),
    }))
    .filter((group) => group.items.length > 0);
  const uncategorized = amenityCatalog.amenities.filter(
    (amenity) =>
      amenity.category_id === null || !categoryIds.has(amenity.category_id),
  );
  const hasAmenities = groups.length > 0 || uncategorized.length > 0;

  return (
    <form
      method="get"
      action={action}
      className="space-y-5 rounded-lg border p-4 lg:sticky lg:top-20 lg:self-start"
    >
      <p className="text-sm font-semibold">Filters</p>

      <div className="space-y-1.5">
        <label htmlFor="filter-sort" className="text-sm font-medium">
          Sort
        </label>
        <select
          id="filter-sort"
          name="sort"
          defaultValue={filters.sort}
          className={FIELD_CLASS}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="filter-type" className="text-sm font-medium">
          Property type
        </label>
        <select
          id="filter-type"
          name="type"
          defaultValue={filters.propertyType ?? ""}
          className={FIELD_CLASS}
        >
          <option value="">Any type</option>
          {PROPERTY_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {cities.length > 0 ? (
        <div className="space-y-1.5">
          <label htmlFor="filter-city" className="text-sm font-medium">
            City
          </label>
          <select
            id="filter-city"
            name="city"
            defaultValue={filters.city ?? ""}
            className={FIELD_CLASS}
          >
            <option value="">Any city</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {areas.length > 0 ? (
        <div className="space-y-1.5">
          <label htmlFor="filter-area" className="text-sm font-medium">
            Area
          </label>
          <select
            id="filter-area"
            name="area"
            defaultValue={filters.area ?? ""}
            className={FIELD_CLASS}
          >
            <option value="">Any area</option>
            {areas.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <span className="text-sm font-medium">Price range</span>
        <div className="flex gap-2">
          <input
            type="number"
            name="minPrice"
            min={0}
            placeholder="Min"
            defaultValue={numberValue(filters.minPrice)}
            aria-label="Minimum price"
            className={FIELD_CLASS}
          />
          <input
            type="number"
            name="maxPrice"
            min={0}
            placeholder="Max"
            defaultValue={numberValue(filters.maxPrice)}
            aria-label="Maximum price"
            className={FIELD_CLASS}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1.5">
          <label htmlFor="filter-bedrooms" className="text-xs font-medium">
            Beds
          </label>
          <select
            id="filter-bedrooms"
            name="bedrooms"
            defaultValue={numberValue(filters.bedrooms)}
            className={FIELD_CLASS}
          >
            <option value="">Any</option>
            {MIN_COUNTS.map((count) => (
              <option key={count} value={count}>
                {count}+
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="filter-bathrooms" className="text-xs font-medium">
            Baths
          </label>
          <select
            id="filter-bathrooms"
            name="bathrooms"
            defaultValue={numberValue(filters.bathrooms)}
            className={FIELD_CLASS}
          >
            <option value="">Any</option>
            {MIN_COUNTS.map((count) => (
              <option key={count} value={count}>
                {count}+
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="filter-guests" className="text-xs font-medium">
            Guests
          </label>
          <select
            id="filter-guests"
            name="guests"
            defaultValue={numberValue(filters.guests)}
            className={FIELD_CLASS}
          >
            <option value="">Any</option>
            {MIN_COUNTS.map((count) => (
              <option key={count} value={count}>
                {count}+
              </option>
            ))}
          </select>
        </div>
      </div>

      {hasAmenities ? (
        <div className="space-y-1.5">
          <span className="text-sm font-medium">Amenities</span>
          <div className="max-h-56 space-y-3 overflow-y-auto rounded-md border p-3">
            {groups.map((group) => (
              <div key={group.category.id} className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">
                  {group.category.name}
                </p>
                {group.items.map((amenity) => (
                  <label
                    key={amenity.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      name="amenities"
                      value={amenity.id}
                      defaultChecked={filters.amenityIds.includes(amenity.id)}
                      className="h-4 w-4 rounded border-input"
                    />
                    {amenity.name}
                  </label>
                ))}
              </div>
            ))}
            {uncategorized.length > 0 ? (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">
                  Other
                </p>
                {uncategorized.map((amenity) => (
                  <label
                    key={amenity.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      name="amenities"
                      value={amenity.id}
                      defaultChecked={filters.amenityIds.includes(amenity.id)}
                      className="h-4 w-4 rounded border-input"
                    />
                    {amenity.name}
                  </label>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <button type="submit" className={buttonVariants()}>
          Apply filters
        </button>
        <Link
          href={action}
          className={buttonVariants({ variant: "ghost" })}
        >
          Reset
        </Link>
      </div>
    </form>
  );
}
