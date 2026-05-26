import Link from "next/link";

import { PROPERTY_TYPE_OPTIONS } from "@/features/properties/constants";
import type { CatalogFilters } from "@/features/properties/queries";
import type { Amenity, AmenityCategory } from "@/features/properties/types";

interface Props {
  action: string;
  filters: CatalogFilters;
  amenityCatalog: { categories: AmenityCategory[]; amenities: Amenity[] };
  cities: string[];
  areas: string[];
}

const BEDS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Any" },
  { value: "1", label: "1+" },
  { value: "2", label: "2+" },
  { value: "3", label: "3+" },
  { value: "4", label: "4+" },
  { value: "5", label: "5+" },
];

/**
 * Editorial-стилизованный сайдбар фильтров.
 * Чистая GET-форма, без клиентского JS — submit формирует query-параметры,
 * страница парсит их и перерисовывает каталог.
 */
export function CatalogEditorialSidebar({
  action,
  filters,
  amenityCatalog,
  cities,
  areas,
}: Props) {
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
      className="ed-sidebar"
      style={{
        position: "sticky",
        top: 100,
        alignSelf: "start",
        maxHeight: "calc(100vh - 120px)",
        overflowY: "auto",
        paddingRight: 16,
        scrollbarWidth: "thin",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 8,
        }}
      >
        <span className="eyebrow gold">Refine</span>
        <Link
          href={action}
          style={{
            fontSize: 11,
            color: "var(--text-tertiary)",
            letterSpacing: "0.04em",
            borderBottom: "1px solid var(--border-subtle)",
            padding: 0,
            textDecoration: "none",
          }}
        >
          Reset all
        </Link>
      </div>

      {/* Property type */}
      <Section title="Property type">
        <select
          name="type"
          defaultValue={filters.propertyType ?? ""}
          className="ed-select"
        >
          <option value="">Any type</option>
          {PROPERTY_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Section>

      {/* City */}
      {cities.length > 0 ? (
        <Section title="City">
          <select
            name="city"
            defaultValue={filters.city ?? ""}
            className="ed-select"
          >
            <option value="">Any city</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </Section>
      ) : null}

      {/* Area */}
      {areas.length > 0 ? (
        <Section title="Area">
          <select
            name="area"
            defaultValue={filters.area ?? ""}
            className="ed-select"
          >
            <option value="">Any area</option>
            {areas.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>
        </Section>
      ) : null}

      {/* Price */}
      <Section title="Price (USD)">
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="number"
            name="minPrice"
            min={0}
            placeholder="Min"
            defaultValue={filters.minPrice ?? ""}
            aria-label="Minimum price"
            className="ed-input"
          />
          <input
            type="number"
            name="maxPrice"
            min={0}
            placeholder="Max"
            defaultValue={filters.maxPrice ?? ""}
            aria-label="Maximum price"
            className="ed-input"
          />
        </div>
      </Section>

      {/* Bedrooms */}
      <Section title="Bedrooms">
        <select
          name="bedrooms"
          defaultValue={filters.bedrooms ?? ""}
          className="ed-select"
        >
          {BEDS_OPTIONS.map((option) => (
            <option key={option.value || "any"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Section>

      {/* Bathrooms */}
      <Section title="Bathrooms">
        <select
          name="bathrooms"
          defaultValue={filters.bathrooms ?? ""}
          className="ed-select"
        >
          {BEDS_OPTIONS.map((option) => (
            <option key={option.value || "any"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Section>

      {/* Guests (актуально для vacation) */}
      {filters.guests !== null || filters.purposes?.includes("short_term_rental") ? (
        <Section title="Guests">
          <select
            name="guests"
            defaultValue={filters.guests ?? ""}
            className="ed-select"
          >
            {BEDS_OPTIONS.map((option) => (
              <option key={option.value || "any"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Section>
      ) : null}

      {/* Amenities */}
      {hasAmenities ? (
        <Section title="Amenities">
          <div
            style={{
              maxHeight: 220,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              paddingRight: 4,
            }}
          >
            {groups.map((group) => (
              <div
                key={group.category.id}
                style={{ display: "flex", flexDirection: "column", gap: 6 }}
              >
                <p
                  style={{
                    fontSize: 10.5,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "var(--text-tertiary)",
                  }}
                >
                  {group.category.name}
                </p>
                {group.items.map((amenity) => (
                  <label
                    key={amenity.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 13,
                      color: "var(--text-secondary)",
                    }}
                  >
                    <input
                      type="checkbox"
                      name="amenities"
                      value={amenity.id}
                      defaultChecked={filters.amenityIds.includes(amenity.id)}
                      style={{ accentColor: "var(--accent)" }}
                    />
                    {amenity.name}
                  </label>
                ))}
              </div>
            ))}
            {uncategorized.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <p
                  style={{
                    fontSize: 10.5,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "var(--text-tertiary)",
                  }}
                >
                  Other
                </p>
                {uncategorized.map((amenity) => (
                  <label
                    key={amenity.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 13,
                      color: "var(--text-secondary)",
                    }}
                  >
                    <input
                      type="checkbox"
                      name="amenities"
                      value={amenity.id}
                      defaultChecked={filters.amenityIds.includes(amenity.id)}
                      style={{ accentColor: "var(--accent)" }}
                    />
                    {amenity.name}
                  </label>
                ))}
              </div>
            ) : null}
          </div>
        </Section>
      ) : null}

      {/* Sort hidden — фактический value управляется отдельным элементом ниже */}
      <input type="hidden" name="sort" value={filters.sort} />

      <div
        style={{
          marginTop: 28,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: "100%", justifyContent: "center" }}
        >
          Apply filters <span className="arrow">→</span>
        </button>
        <Link
          href="/contact"
          className="btn btn-ghost"
          style={{ width: "100%", justifyContent: "center" }}
        >
          Can&apos;t find it? Ask us
        </Link>
      </div>

      <style>{`
        .ed-sidebar .ed-select,
        .ed-sidebar .ed-input {
          width: 100%;
          padding: 10px 12px;
          font-size: 13px;
          font-family: inherit;
          color: var(--text-primary);
          background: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          border-radius: 2px;
          outline: none;
          transition: border-color 300ms var(--ease-out-expo);
        }
        .ed-sidebar .ed-select:focus,
        .ed-sidebar .ed-input:focus {
          border-color: var(--accent);
        }
      `}</style>
    </form>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        borderBottom: "1px solid var(--border-subtle)",
        padding: "20px 0",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <span
        className="serif"
        style={{
          fontSize: 18,
          letterSpacing: "-0.015em",
          color: "var(--text-primary)",
          fontWeight: 400,
        }}
      >
        {title}
      </span>
      {children}
    </div>
  );
}
