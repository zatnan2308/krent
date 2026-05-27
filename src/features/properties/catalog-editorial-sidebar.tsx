"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { PROPERTY_TYPE_OPTIONS } from "@/features/properties/constants";
import type { CatalogFilters } from "@/features/properties/queries";
import type { Amenity, AmenityCategory } from "@/features/properties/types";

interface Props {
  /** Базовый URL страницы (/{locale}/{path}) — без query. */
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
 *
 * Все изменения применяются мгновенно (auto-apply): каждый onChange
 * пишет соответствующий query-параметр в URL через router.replace, что
 * приводит к streaming-обновлению результатов без полной перезагрузки.
 *
 * Текстовые числовые поля (minPrice/maxPrice) дебаунсятся на 500ms
 * чтобы не дёргать сервер на каждое нажатие клавиши.
 *
 * useTransition даёт `pending`-состояние — сайдбар чуть притухает, пока
 * результат загружается.
 */
export function CatalogEditorialSidebar({
  action,
  filters,
  amenityCatalog,
  cities,
  areas,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = React.useTransition();

  // Локальное состояние числовых полей — чтобы input не «прыгал» назад
  // в момент server-round-trip'а.
  const [minPriceLocal, setMinPriceLocal] = React.useState(
    filters.minPrice !== null ? String(filters.minPrice) : "",
  );
  const [maxPriceLocal, setMaxPriceLocal] = React.useState(
    filters.maxPrice !== null ? String(filters.maxPrice) : "",
  );
  // Синхронизируемся, если фильтры пришли извне (например, по reset chip).
  React.useEffect(() => {
    setMinPriceLocal(filters.minPrice !== null ? String(filters.minPrice) : "");
  }, [filters.minPrice]);
  React.useEffect(() => {
    setMaxPriceLocal(filters.maxPrice !== null ? String(filters.maxPrice) : "");
  }, [filters.maxPrice]);

  /** Записывает один параметр в URL и стартует transition.
   *  value === "" → параметр удаляется. */
  const pushParam = React.useCallback(
    (key: string, value: string | string[] | null) => {
      const params = new URLSearchParams(searchParams.toString());
      // Сбрасываем номер страницы при любом изменении фильтра.
      params.delete("page");
      params.delete(key);
      if (Array.isArray(value)) {
        for (const v of value) {
          if (v) params.append(key, v);
        }
      } else if (value !== null && value !== "") {
        params.set(key, value);
      }
      const qs = params.toString();
      startTransition(() => {
        router.replace(qs ? `${action}?${qs}` : action, { scroll: false });
      });
    },
    [action, router, searchParams],
  );

  // Дебаунс для числовых полей.
  const minDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  function handleMinPriceChange(value: string) {
    setMinPriceLocal(value);
    if (minDebounceRef.current) clearTimeout(minDebounceRef.current);
    minDebounceRef.current = setTimeout(() => {
      pushParam("minPrice", value.trim() || null);
    }, 500);
  }
  function handleMaxPriceChange(value: string) {
    setMaxPriceLocal(value);
    if (maxDebounceRef.current) clearTimeout(maxDebounceRef.current);
    maxDebounceRef.current = setTimeout(() => {
      pushParam("maxPrice", value.trim() || null);
    }, 500);
  }

  function toggleAmenity(id: string) {
    const current = filters.amenityIds;
    const next = current.includes(id)
      ? current.filter((x) => x !== id)
      : [...current, id];
    pushParam("amenities", next);
  }

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
    <aside
      className="ed-sidebar"
      style={{
        position: "sticky",
        top: 100,
        alignSelf: "start",
        maxHeight: "calc(100vh - 120px)",
        overflowY: "auto",
        paddingRight: 16,
        scrollbarWidth: "thin",
        opacity: pending ? 0.6 : 1,
        transition: "opacity 200ms var(--ease-out-expo)",
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
          onClick={(event) => {
            event.preventDefault();
            startTransition(() => {
              router.replace(action, { scroll: false });
            });
          }}
        >
          Reset all
        </Link>
      </div>

      <Section title="Property type">
        <select
          value={filters.propertyType ?? ""}
          onChange={(e) => pushParam("type", e.target.value || null)}
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

      {cities.length > 0 ? (
        <Section title="City">
          <select
            value={filters.city ?? ""}
            onChange={(e) => pushParam("city", e.target.value || null)}
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

      {areas.length > 0 ? (
        <Section title="Area">
          <select
            value={filters.area ?? ""}
            onChange={(e) => pushParam("area", e.target.value || null)}
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

      <Section title="Price (USD)">
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="number"
            min={0}
            placeholder="Min"
            value={minPriceLocal}
            onChange={(e) => handleMinPriceChange(e.target.value)}
            aria-label="Minimum price"
            className="ed-input"
          />
          <input
            type="number"
            min={0}
            placeholder="Max"
            value={maxPriceLocal}
            onChange={(e) => handleMaxPriceChange(e.target.value)}
            aria-label="Maximum price"
            className="ed-input"
          />
        </div>
      </Section>

      <Section title="Bedrooms">
        <select
          value={filters.bedrooms ?? ""}
          onChange={(e) => pushParam("bedrooms", e.target.value || null)}
          className="ed-select"
        >
          {BEDS_OPTIONS.map((option) => (
            <option key={option.value || "any"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Section>

      <Section title="Bathrooms">
        <select
          value={filters.bathrooms ?? ""}
          onChange={(e) => pushParam("bathrooms", e.target.value || null)}
          className="ed-select"
        >
          {BEDS_OPTIONS.map((option) => (
            <option key={option.value || "any"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Section>

      {filters.guests !== null ||
      filters.purposes?.includes("short_term_rental") ? (
        <Section title="Guests">
          <select
            value={filters.guests ?? ""}
            onChange={(e) => pushParam("guests", e.target.value || null)}
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
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={filters.amenityIds.includes(amenity.id)}
                      onChange={() => toggleAmenity(amenity.id)}
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
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={filters.amenityIds.includes(amenity.id)}
                      onChange={() => toggleAmenity(amenity.id)}
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

      <div
        style={{
          marginTop: 28,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
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
    </aside>
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
