"use client";

import * as React from "react";
import Link from "next/link";

/** Тип сделки карточки (маппинг purpose → дизайн). */
type Deal = "sale" | "rent" | "vacation" | "other";
/** Значение фильтра «сделка» — никогда не бывает "other". */
export type DealFilter = "all" | "sale" | "rent" | "vacation";

/** Карточка объекта для клиентского каталога. */
export interface CatalogItem {
  id: string;
  href: string;
  title: string;
  deal: Deal;
  type: string | null;
  district: string;
  location: string;
  beds: number;
  baths: number;
  sqft: number | null;
  sizeUnit: string;
  view: string | null;
  furnishing: string | null;
  completion: string | null;
  ownership: string | null;
  yield: number | null;
  tags: string[];
  amenities: string[];
  badge: string | null;
  priceVal: number | null;
  priceDisplay: string | null;
  priceCycle: string | null;
  img: string | null;
}

interface Filters {
  deal: DealFilter;
  city: string;
  types: string[];
  price: [number, number];
  beds: string;
  baths: string;
  views: string[];
  furnishing: string;
  completion: string;
  ownership: string;
  yield: string;
  amenities: string[];
  tags: string[];
}

const PRICE_MAX = 20_000_000;

const DEAL_TITLE: Record<Filters["deal"], string> = {
  all: "Properties",
  sale: "For sale",
  rent: "For long-term rent",
  vacation: "Vacation rentals",
};

const DEAL_LABEL: Record<Deal, string> = {
  sale: "For sale",
  rent: "Long-term rent",
  vacation: "Vacation",
  other: "Featured",
};

function formatUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

function uniqueSorted(values: (string | null | undefined)[]): string[] {
  return Array.from(
    new Set(values.filter((v): v is string => Boolean(v && v.trim()))),
  ).sort((a, b) => a.localeCompare(b));
}

interface Props {
  items: CatalogItem[];
  amenityOptions: string[];
  initialDeal: Filters["deal"];
  contactHref: string;
}

export function PropertiesCatalog({
  items,
  amenityOptions,
  initialDeal,
  contactHref,
}: Props) {
  const defaultFilters = React.useMemo<Filters>(
    () => ({
      deal: "all",
      city: "All",
      types: [],
      price: [0, PRICE_MAX],
      beds: "Any",
      baths: "Any",
      views: [],
      furnishing: "Any",
      completion: "Any",
      ownership: "Any",
      yield: "Any",
      amenities: [],
      tags: [],
    }),
    [],
  );

  const [filters, setFilters] = React.useState<Filters>({
    ...defaultFilters,
    deal: initialDeal,
  });
  const [view, setView] = React.useState<"list" | "grid">("list");
  const [density, setDensity] = React.useState(2);
  const [sort, setSort] = React.useState("newest");
  const [page, setPage] = React.useState(1);

  // Опции фильтров — из реальных данных (configurable: что в БД, то и в фильтре).
  const districts = React.useMemo(
    () => ["All", ...uniqueSorted(items.map((i) => i.district))],
    [items],
  );
  const typeOptions = React.useMemo(
    () => uniqueSorted(items.map((i) => i.type)),
    [items],
  );
  const viewOptions = React.useMemo(
    () => uniqueSorted(items.map((i) => i.view)),
    [items],
  );
  const tagOptions = React.useMemo(
    () => uniqueSorted(items.flatMap((i) => i.tags)),
    [items],
  );

  const filtered = React.useMemo(() => {
    return items.filter((p) => {
      if (filters.deal !== "all" && p.deal !== filters.deal) return false;
      if (filters.city !== "All" && p.district !== filters.city) return false;
      if (filters.types.length && (!p.type || !filters.types.includes(p.type)))
        return false;
      if (
        p.priceVal !== null &&
        (p.priceVal < filters.price[0] || p.priceVal > filters.price[1])
      )
        return false;
      if (filters.beds !== "Any" && p.beds < parseInt(filters.beds, 10))
        return false;
      if (filters.baths !== "Any" && p.baths < parseInt(filters.baths, 10))
        return false;
      if (filters.views.length && (!p.view || !filters.views.includes(p.view)))
        return false;
      if (filters.furnishing !== "Any" && p.furnishing !== filters.furnishing)
        return false;
      if (filters.completion !== "Any") {
        const isOff = (p.completion ?? "").startsWith("Off-plan");
        if (filters.completion === "Ready" && isOff) return false;
        if (filters.completion === "Off-plan" && !isOff) return false;
      }
      if (filters.ownership !== "Any" && p.ownership !== filters.ownership)
        return false;
      if (filters.yield !== "Any") {
        const threshold = parseInt(filters.yield.replace(/[^\d]/g, ""), 10);
        if (!p.yield || p.yield < threshold) return false;
      }
      if (
        filters.amenities.length &&
        !filters.amenities.every((a) => p.amenities.includes(a))
      )
        return false;
      if (filters.tags.length && !filters.tags.every((t) => p.tags.includes(t)))
        return false;
      return true;
    });
  }, [items, filters]);

  const sorted = React.useMemo(() => {
    const arr = [...filtered];
    if (sort === "price-asc")
      arr.sort((a, b) => (a.priceVal ?? Infinity) - (b.priceVal ?? Infinity));
    else if (sort === "price-desc")
      arr.sort((a, b) => (b.priceVal ?? -1) - (a.priceVal ?? -1));
    else if (sort === "sqft-desc")
      arr.sort((a, b) => (b.sqft ?? 0) - (a.sqft ?? 0));
    else if (sort === "featured")
      arr.sort((a, b) => (b.badge ? 1 : 0) - (a.badge ? 1 : 0));
    return arr;
  }, [filtered, sort]);

  const perPage = view === "list" ? 6 : 9;
  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paginated = sorted.slice((safePage - 1) * perPage, safePage * perPage);

  React.useEffect(() => {
    setPage(1);
  }, [filters, sort, view]);

  // Применённые чипсы.
  const chips: { label: string; onClear: () => void }[] = [];
  if (filters.deal !== "all")
    chips.push({
      label: DEAL_LABEL[filters.deal],
      onClear: () => setFilters((f) => ({ ...f, deal: "all" })),
    });
  if (filters.city !== "All")
    chips.push({
      label: filters.city,
      onClear: () => setFilters((f) => ({ ...f, city: "All" })),
    });
  filters.types.forEach((t) =>
    chips.push({
      label: t,
      onClear: () =>
        setFilters((f) => ({ ...f, types: f.types.filter((x) => x !== t) })),
    }),
  );
  if (filters.beds !== "Any")
    chips.push({
      label: `${filters.beds} bed`,
      onClear: () => setFilters((f) => ({ ...f, beds: "Any" })),
    });
  if (filters.baths !== "Any")
    chips.push({
      label: `${filters.baths} bath`,
      onClear: () => setFilters((f) => ({ ...f, baths: "Any" })),
    });
  filters.views.forEach((v) =>
    chips.push({
      label: v,
      onClear: () =>
        setFilters((f) => ({ ...f, views: f.views.filter((x) => x !== v) })),
    }),
  );
  if (filters.furnishing !== "Any")
    chips.push({
      label: filters.furnishing,
      onClear: () => setFilters((f) => ({ ...f, furnishing: "Any" })),
    });
  if (filters.completion !== "Any")
    chips.push({
      label: filters.completion,
      onClear: () => setFilters((f) => ({ ...f, completion: "Any" })),
    });
  if (filters.ownership !== "Any")
    chips.push({
      label: filters.ownership,
      onClear: () => setFilters((f) => ({ ...f, ownership: "Any" })),
    });
  if (filters.yield !== "Any")
    chips.push({
      label: `Yield ${filters.yield}`,
      onClear: () => setFilters((f) => ({ ...f, yield: "Any" })),
    });
  filters.amenities.forEach((a) =>
    chips.push({
      label: a,
      onClear: () =>
        setFilters((f) => ({
          ...f,
          amenities: f.amenities.filter((x) => x !== a),
        })),
    }),
  );
  filters.tags.forEach((t) =>
    chips.push({
      label: t,
      onClear: () =>
        setFilters((f) => ({ ...f, tags: f.tags.filter((x) => x !== t) })),
    }),
  );

  return (
    <>
      {/* ---- Page header ---- */}
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
            Catalogue · refreshed Monday
          </span>
          <h1
            className="serif"
            style={{
              marginTop: 18,
              fontSize: "clamp(2.5rem, 6vw, 5.25rem)",
              letterSpacing: "-0.04em",
              lineHeight: 0.95,
              fontWeight: 400,
            }}
          >
            {DEAL_TITLE[filters.deal]}
          </h1>
          <p
            className="tnum"
            style={{
              marginTop: 22,
              fontSize: 16,
              color: "var(--text-secondary)",
              letterSpacing: "-0.005em",
            }}
          >
            {filtered.length} of {items.length} active listings
            {filters.city !== "All" ? ` in ${filters.city}` : " across Dubai"}
            {" · "}
            <span style={{ color: "var(--text-tertiary)" }}>
              All viewed and vetted by Alexey personally
            </span>
          </p>
        </div>
      </section>

      {/* ---- Main: sidebar + content ---- */}
      <section
        style={{
          maxWidth: "var(--max-w)",
          margin: "0 auto",
          padding: "40px var(--edge-d) 80px",
        }}
      >
        <div
          className="cat-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "280px 1fr",
            gap: 56,
            alignItems: "start",
          }}
        >
          <Sidebar
            filters={filters}
            setFilters={setFilters}
            defaultFilters={defaultFilters}
            districts={districts}
            typeOptions={typeOptions}
            viewOptions={viewOptions}
            tagOptions={tagOptions}
            amenityOptions={amenityOptions}
            contactHref={contactHref}
          />

          <div style={{ minWidth: 0 }}>
            <Toolbar
              chips={chips}
              view={view}
              setView={setView}
              density={density}
              setDensity={setDensity}
              sort={sort}
              setSort={setSort}
              totalShown={sorted.length}
            />

            {paginated.length === 0 ? (
              <EmptyState
                onReset={() => setFilters(defaultFilters)}
                contactHref={contactHref}
              />
            ) : view === "grid" ? (
              <div
                className="grid-view"
                style={{
                  paddingTop: 40,
                  display: "grid",
                  gridTemplateColumns: `repeat(${density}, 1fr)`,
                  gap: "48px 32px",
                }}
              >
                {paginated.map((p, i) => (
                  <GridCard
                    key={p.id}
                    prop={p}
                    idx={String((safePage - 1) * perPage + i + 1).padStart(2, "0")}
                    total={String(sorted.length).padStart(2, "0")}
                  />
                ))}
              </div>
            ) : (
              <div>
                {paginated.map((p, i) => (
                  <ListCard
                    key={p.id}
                    prop={p}
                    idx={String((safePage - 1) * perPage + i + 1).padStart(2, "0")}
                    total={String(sorted.length).padStart(2, "0")}
                  />
                ))}
              </div>
            )}

            <Pagination page={safePage} setPage={setPage} totalPages={totalPages} />
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 1024px) {
          .cat-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
          .cat-sidebar { position: static !important; max-height: none !important; padding-right: 0 !important; }
          .grid-view { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 640px) {
          .grid-view { grid-template-columns: 1fr !important; }
          .list-card { grid-template-columns: 1fr !important; gap: 20px !important; }
        }
      `}</style>
    </>
  );
}

// ============================================================
//  Sidebar
// ============================================================

function FilterSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div style={{ borderBottom: "1px solid var(--border-subtle)", padding: "20px 0" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: 0,
          textAlign: "left",
          background: "transparent",
          border: "none",
          cursor: "pointer",
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
        <span
          style={{
            color: "var(--text-tertiary)",
            fontSize: 12,
            transform: open ? "rotate(180deg)" : "rotate(0)",
            transition: "transform 400ms var(--ease-out-expo)",
          }}
        >
          ▾
        </span>
      </button>
      {open ? <div style={{ paddingTop: 18 }}>{children}</div> : null}
    </div>
  );
}

function PillRow({
  options,
  value,
  onChange,
  multi = false,
}: {
  options: string[];
  value: string | string[];
  onChange: (next: string | string[]) => void;
  multi?: boolean;
}) {
  const isActive = (opt: string) =>
    multi ? (value as string[]).includes(opt) : value === opt;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px" }}>
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => {
            if (multi) {
              const arr = value as string[];
              onChange(
                arr.includes(opt)
                  ? arr.filter((v) => v !== opt)
                  : [...arr, opt],
              );
            } else {
              onChange(opt);
            }
          }}
          style={{
            padding: "6px 0",
            fontSize: 13,
            color: isActive(opt) ? "var(--accent)" : "var(--text-secondary)",
            borderBottom: `1px solid ${isActive(opt) ? "var(--accent)" : "transparent"}`,
            letterSpacing: "-0.005em",
            background: "transparent",
            border: "none",
            borderBottomWidth: 1,
            borderBottomStyle: "solid",
            borderBottomColor: isActive(opt) ? "var(--accent)" : "transparent",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function RangeSlider({
  min,
  max,
  value,
  onChange,
}: {
  min: number;
  max: number;
  value: [number, number];
  onChange: (next: [number, number]) => void;
}) {
  const [lo, hi] = value;
  const pct = (v: number) => ((v - min) / (max - min)) * 100;
  return (
    <div>
      <div style={{ position: "relative", height: 28, display: "flex", alignItems: "center" }}>
        <div style={{ position: "absolute", left: 0, right: 0, height: 1, background: "var(--border-medium)" }} />
        <div
          style={{
            position: "absolute",
            left: `${pct(lo)}%`,
            right: `${100 - pct(hi)}%`,
            height: 1,
            background: "var(--accent)",
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={50000}
          value={lo}
          onChange={(e) => onChange([Math.min(+e.target.value, hi - 50000), hi])}
          className="cat-range"
        />
        <input
          type="range"
          min={min}
          max={max}
          step={50000}
          value={hi}
          onChange={(e) => onChange([lo, Math.max(+e.target.value, lo + 50000)])}
          className="cat-range"
        />
      </div>
      <div
        className="tnum"
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 4,
          fontSize: 12,
          color: "var(--text-tertiary)",
          letterSpacing: "0.04em",
        }}
      >
        <span>{formatUsd(lo)}</span>
        <span>
          {hi >= max ? `${formatUsd(max)}+` : formatUsd(hi)}
        </span>
      </div>
      <style>{`
        .cat-range {
          position: absolute; left: 0; right: 0; width: 100%; height: 28px;
          background: transparent; -webkit-appearance: none; appearance: none;
          pointer-events: none;
        }
        .cat-range::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none; width: 14px; height: 14px;
          background: var(--bg-elevated); border: 1.5px solid var(--accent);
          border-radius: 50%; cursor: grab; pointer-events: auto;
        }
        .cat-range::-moz-range-thumb {
          width: 14px; height: 14px; background: var(--bg-elevated);
          border: 1.5px solid var(--accent); border-radius: 50%; cursor: grab;
          pointer-events: auto;
        }
      `}</style>
    </div>
  );
}

function Sidebar({
  filters,
  setFilters,
  defaultFilters,
  districts,
  typeOptions,
  viewOptions,
  tagOptions,
  amenityOptions,
  contactHref,
}: {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  defaultFilters: Filters;
  districts: string[];
  typeOptions: string[];
  viewOptions: string[];
  tagOptions: string[];
  amenityOptions: string[];
  contactHref: string;
}) {
  const update = (patch: Partial<Filters>) =>
    setFilters((f) => ({ ...f, ...patch }));

  const DEAL_TO_LABEL: Record<Filters["deal"], string> = {
    all: "All",
    sale: "Buy",
    rent: "Long-term rent",
    vacation: "Vacation",
  };
  const LABEL_TO_DEAL: Record<string, Filters["deal"]> = {
    All: "all",
    Buy: "sale",
    "Long-term rent": "rent",
    Vacation: "vacation",
  };

  return (
    <aside
      className="cat-sidebar"
      style={{
        position: "sticky",
        top: 100,
        alignSelf: "start",
        maxHeight: "calc(100vh - 120px)",
        overflowY: "auto",
        paddingRight: 16,
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
        <button
          type="button"
          onClick={() =>
            setFilters({
              ...defaultFilters,
              deal: filters.deal,
              city: filters.city,
            })
          }
          style={{
            fontSize: 11,
            color: "var(--text-tertiary)",
            letterSpacing: "0.04em",
            borderBottom: "1px solid var(--border-subtle)",
            padding: 0,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Reset all
        </button>
      </div>

      <FilterSection title="Deal type">
        <PillRow
          options={["All", "Buy", "Long-term rent", "Vacation"]}
          value={DEAL_TO_LABEL[filters.deal]}
          onChange={(v) => update({ deal: LABEL_TO_DEAL[v as string] })}
        />
      </FilterSection>

      {districts.length > 1 ? (
        <FilterSection title="District">
          <PillRow
            options={districts}
            value={filters.city}
            onChange={(v) => update({ city: v as string })}
          />
        </FilterSection>
      ) : null}

      {typeOptions.length > 0 ? (
        <FilterSection title="Property type">
          <PillRow
            multi
            options={typeOptions}
            value={filters.types}
            onChange={(v) => update({ types: v as string[] })}
          />
        </FilterSection>
      ) : null}

      <FilterSection title="Price (USD)">
        <RangeSlider
          min={0}
          max={PRICE_MAX}
          value={filters.price}
          onChange={(v) => update({ price: v })}
        />
      </FilterSection>

      <FilterSection title="Bedrooms">
        <PillRow
          options={["Any", "1", "2", "3", "4", "5"]}
          value={filters.beds}
          onChange={(v) => update({ beds: v as string })}
        />
      </FilterSection>

      <FilterSection title="Bathrooms">
        <PillRow
          options={["Any", "1", "2", "3", "4", "5"]}
          value={filters.baths}
          onChange={(v) => update({ baths: v as string })}
        />
      </FilterSection>

      {viewOptions.length > 0 ? (
        <FilterSection title="View" defaultOpen={false}>
          <PillRow
            multi
            options={viewOptions}
            value={filters.views}
            onChange={(v) => update({ views: v as string[] })}
          />
        </FilterSection>
      ) : null}

      <FilterSection title="Furnishing" defaultOpen={false}>
        <PillRow
          options={["Any", "Furnished", "Semi-furnished", "Unfurnished"]}
          value={filters.furnishing}
          onChange={(v) => update({ furnishing: v as string })}
        />
      </FilterSection>

      <FilterSection title="Completion" defaultOpen={false}>
        <PillRow
          options={["Any", "Ready", "Off-plan"]}
          value={filters.completion}
          onChange={(v) => update({ completion: v as string })}
        />
      </FilterSection>

      <FilterSection title="Ownership" defaultOpen={false}>
        <PillRow
          options={["Any", "Freehold", "Leasehold"]}
          value={filters.ownership}
          onChange={(v) => update({ ownership: v as string })}
        />
      </FilterSection>

      <FilterSection title="Rental yield" defaultOpen={false}>
        <PillRow
          options={["Any", ">5%", ">7%", ">9%"]}
          value={filters.yield}
          onChange={(v) => update({ yield: v as string })}
        />
      </FilterSection>

      {amenityOptions.length > 0 ? (
        <FilterSection title="Amenities" defaultOpen={false}>
          <PillRow
            multi
            options={amenityOptions}
            value={filters.amenities}
            onChange={(v) => update({ amenities: v as string[] })}
          />
        </FilterSection>
      ) : null}

      {tagOptions.length > 0 ? (
        <FilterSection title="Lifestyle tags" defaultOpen={false}>
          <PillRow
            multi
            options={tagOptions}
            value={filters.tags}
            onChange={(v) => update({ tags: v as string[] })}
          />
        </FilterSection>
      ) : null}

      <div style={{ marginTop: 32 }}>
        <Link
          href={contactHref}
          className="btn btn-primary"
          style={{ width: "100%", justifyContent: "center" }}
        >
          Can&apos;t find it? Ask Alexey <span className="arrow">→</span>
        </Link>
      </div>
    </aside>
  );
}

// ============================================================
//  Toolbar
// ============================================================

function Toolbar({
  chips,
  view,
  setView,
  density,
  setDensity,
  sort,
  setSort,
  totalShown,
}: {
  chips: { label: string; onClear: () => void }[];
  view: "list" | "grid";
  setView: (v: "list" | "grid") => void;
  density: number;
  setDensity: (d: number) => void;
  sort: string;
  setSort: (s: string) => void;
  totalShown: number;
}) {
  return (
    <div
      style={{
        padding: "28px 0 20px",
        borderBottom: "1px solid var(--border-subtle)",
        display: "flex",
        flexDirection: "column",
        gap: 18,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 24,
          flexWrap: "wrap",
        }}
      >
        <div
          className="tnum"
          style={{
            fontSize: 12,
            letterSpacing: "0.06em",
            color: "var(--text-tertiary)",
            textTransform: "uppercase",
          }}
        >
          Showing <span style={{ color: "var(--text-primary)" }}>{totalShown}</span>{" "}
          result{totalShown !== 1 ? "s" : ""}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 32, flexWrap: "wrap" }}>
          <SortDropdown sort={sort} setSort={setSort} />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              borderLeft: "1px solid var(--border-subtle)",
              paddingLeft: 24,
            }}
          >
            {(["list", "grid"] as const).map((k) => {
              const active = view === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setView(k)}
                  style={{
                    padding: "6px 12px",
                    fontSize: 12,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: active ? "var(--accent)" : "var(--text-secondary)",
                    borderBottom: `1px solid ${active ? "var(--accent)" : "transparent"}`,
                    background: "transparent",
                    border: "none",
                    borderBottomWidth: 1,
                    borderBottomStyle: "solid",
                    borderBottomColor: active ? "var(--accent)" : "transparent",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {k}
                </button>
              );
            })}
          </div>
          {view === "grid" ? (
            <div
              style={{
                display: "flex",
                gap: 4,
                borderLeft: "1px solid var(--border-subtle)",
                paddingLeft: 24,
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: 10.5,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "var(--text-tertiary)",
                  marginRight: 8,
                }}
              >
                Density
              </span>
              {[2, 3].map((d) => {
                const active = density === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDensity(d)}
                    style={{
                      padding: "6px 8px",
                      fontSize: 12,
                      color: active ? "var(--accent)" : "var(--text-secondary)",
                      background: "transparent",
                      border: "none",
                      borderBottom: `1px solid ${active ? "var(--accent)" : "transparent"}`,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {d} col
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>

      {chips.length > 0 ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span
            style={{
              fontSize: 10.5,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--text-tertiary)",
              marginRight: 8,
            }}
          >
            Applied
          </span>
          {chips.map((c, i) => (
            <button
              key={`${c.label}-${i}`}
              type="button"
              onClick={c.onClear}
              style={{
                padding: "6px 12px",
                fontSize: 12,
                letterSpacing: "0.01em",
                color: "var(--text-primary)",
                border: "1px solid var(--border-medium)",
                background: "var(--bg-elevated)",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {c.label}
              <span style={{ fontSize: 14, lineHeight: 1, color: "var(--text-tertiary)" }}>
                ×
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SortDropdown({
  sort,
  setSort,
}: {
  sort: string;
  setSort: (s: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const opts = [
    { k: "newest", label: "Newest first" },
    { k: "price-asc", label: "Price ascending" },
    { k: "price-desc", label: "Price descending" },
    { k: "sqft-desc", label: "Largest area" },
    { k: "featured", label: "Featured first" },
  ];
  const cur = opts.find((o) => o.k === sort) ?? opts[0]!;
  return (
    <div style={{ position: "relative" }} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        onMouseEnter={() => setOpen(true)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          padding: "6px 0",
          fontSize: 12,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--text-primary)",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        <span style={{ color: "var(--text-tertiary)", marginRight: 4 }}>Sort:</span>
        <span>{cur.label}</span>
        <span
          style={{
            fontSize: 9,
            color: "var(--text-tertiary)",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 300ms",
          }}
        >
          ▼
        </span>
      </button>
      {open ? (
        <div
          className="ed-light-panel"
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: 8,
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-subtle)",
            minWidth: 220,
            zIndex: 20,
            boxShadow: "0 12px 36px -12px rgba(11,11,12,0.18)",
          }}
        >
          {opts.map((o) => (
            <button
              key={o.k}
              type="button"
              onClick={() => {
                setSort(o.k);
                setOpen(false);
              }}
              style={{
                display: "block",
                width: "100%",
                padding: "12px 18px",
                textAlign: "left",
                fontSize: 13,
                color: o.k === sort ? "var(--accent)" : "var(--text-primary)",
                background: "transparent",
                border: "none",
                letterSpacing: "0.01em",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ============================================================
//  Cards
// ============================================================

function PriceTag({ prop, big }: { prop: CatalogItem; big?: boolean }) {
  if (!prop.priceDisplay) {
    return (
      <span style={{ fontSize: 13, color: "var(--text-tertiary)", fontStyle: "italic" }}>
        Price on request
      </span>
    );
  }
  return (
    <span
      className="serif tnum"
      style={{
        fontSize: big ? "clamp(1.5rem, 2.6vw, 2.1rem)" : "clamp(1.1rem, 1.6vw, 1.5rem)",
        letterSpacing: "-0.025em",
        color: "var(--accent)",
        lineHeight: 1,
        fontWeight: 400,
      }}
    >
      {prop.priceDisplay}
      {prop.priceCycle ? (
        <span
          style={{
            fontSize: big ? "0.5em" : "0.55em",
            color: "var(--text-tertiary)",
            marginLeft: 6,
            fontStyle: "italic",
          }}
        >
          {prop.priceCycle}
        </span>
      ) : null}
    </span>
  );
}

function specRow(prop: CatalogItem): string[] {
  return [
    prop.beds > 0 ? `${prop.beds} bed` : null,
    prop.baths > 0 ? `${prop.baths} bath` : null,
    prop.sqft ? `${prop.sqft.toLocaleString()} ${prop.sizeUnit}` : null,
  ].filter(Boolean) as string[];
}

function Badge({ prop, small }: { prop: CatalogItem; small?: boolean }) {
  if (!prop.badge) return null;
  return (
    <div
      className="on-dark"
      style={{
        position: "absolute",
        top: small ? 14 : 16,
        left: small ? 14 : 16,
        fontSize: small ? 9.5 : 10,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color: "var(--accent)",
        border: "1px solid var(--accent-line)",
        padding: small ? "4px 8px" : "5px 10px",
        background: "rgba(11,11,12,0.45)",
        backdropFilter: "blur(8px)",
      }}
    >
      {prop.badge}
    </div>
  );
}

function ListCard({
  prop,
  idx,
  total,
}: {
  prop: CatalogItem;
  idx: string;
  total: string;
}) {
  const specs = specRow(prop);
  return (
    <Link
      href={prop.href}
      className="list-card img-hover"
      style={{
        display: "grid",
        gridTemplateColumns: "6fr 5fr",
        gap: 48,
        padding: "36px 0",
        borderTop: "1px solid var(--border-subtle)",
        alignItems: "stretch",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <div
        style={{
          aspectRatio: "4 / 3",
          overflow: "hidden",
          position: "relative",
          background: "var(--bg-secondary)",
        }}
      >
        {prop.img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={prop.img}
            alt={prop.title}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : null}
        <Badge prop={prop} />
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          paddingTop: 6,
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: 16,
            }}
          >
            <span className="eyebrow gold">{DEAL_LABEL[prop.deal]}</span>
            <span
              className="tnum"
              style={{ fontSize: 11, letterSpacing: "0.22em", color: "var(--text-tertiary)" }}
            >
              {idx} / {total}
            </span>
          </div>
          <h3
            className="serif"
            style={{
              fontSize: "clamp(1.5rem, 2.6vw, 2.2rem)",
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              color: "var(--text-primary)",
              fontWeight: 400,
            }}
          >
            {prop.title}
          </h3>
          <div style={{ marginTop: 12, fontSize: 13.5, color: "var(--text-secondary)" }}>
            {prop.location} · Dubai
          </div>
          <div
            className="tnum"
            style={{
              marginTop: 20,
              fontSize: 13,
              color: "var(--text-tertiary)",
              letterSpacing: "0.04em",
              display: "flex",
              gap: 20,
              flexWrap: "wrap",
            }}
          >
            {specs.map((s) => (
              <span key={s}>{s}</span>
            ))}
            {prop.view ? (
              <span style={{ color: "var(--text-secondary)" }}>{prop.view}</span>
            ) : null}
          </div>
        </div>
        <div
          style={{
            marginTop: 32,
            paddingTop: 24,
            borderTop: "1px solid var(--border-subtle)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "end",
          }}
        >
          <div>
            <PriceTag prop={prop} big />
            {prop.yield ? (
              <div
                className="tnum"
                style={{
                  marginTop: 6,
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                  letterSpacing: "0.06em",
                }}
              >
                Est. yield {prop.yield}%
              </div>
            ) : null}
          </div>
          <span
            className="btn-text"
            style={{
              fontSize: 12,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--text-primary)",
            }}
          >
            View details <span className="arrow">→</span>
          </span>
        </div>
      </div>
    </Link>
  );
}

function GridCard({
  prop,
  idx,
  total,
}: {
  prop: CatalogItem;
  idx: string;
  total: string;
}) {
  const specs = specRow(prop);
  return (
    <Link
      href={prop.href}
      className="img-hover"
      style={{ display: "block", textDecoration: "none", color: "inherit" }}
    >
      <div
        style={{
          aspectRatio: "4 / 3",
          overflow: "hidden",
          position: "relative",
          background: "var(--bg-secondary)",
        }}
      >
        {prop.img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={prop.img}
            alt={prop.title}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : null}
        <Badge prop={prop} small />
      </div>
      <div style={{ paddingTop: 18 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 8,
          }}
        >
          <span className="eyebrow gold">{DEAL_LABEL[prop.deal]}</span>
          <span
            className="tnum"
            style={{ fontSize: 10.5, letterSpacing: "0.22em", color: "var(--text-tertiary)" }}
          >
            {idx} / {total}
          </span>
        </div>
        <h3
          className="serif"
          style={{
            fontSize: "clamp(1.2rem, 1.8vw, 1.5rem)",
            letterSpacing: "-0.025em",
            lineHeight: 1.1,
            color: "var(--text-primary)",
            fontWeight: 400,
            textWrap: "pretty",
          }}
        >
          {prop.title}
        </h3>
        <div style={{ marginTop: 8, fontSize: 12.5, color: "var(--text-secondary)" }}>
          {prop.location} · Dubai
        </div>
        <div
          className="tnum"
          style={{
            marginTop: 10,
            fontSize: 11.5,
            color: "var(--text-tertiary)",
            letterSpacing: "0.04em",
            display: "flex",
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          {specs.map((s) => (
            <span key={s}>{s}</span>
          ))}
        </div>
        <div
          style={{
            marginTop: 16,
            paddingTop: 14,
            borderTop: "1px solid var(--border-subtle)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
          }}
        >
          <PriceTag prop={prop} />
          <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>→</span>
        </div>
      </div>
    </Link>
  );
}

// ============================================================
//  Pagination + empty state
// ============================================================

function Pagination({
  page,
  setPage,
  totalPages,
}: {
  page: number;
  setPage: (p: number) => void;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  return (
    <nav
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 24,
        padding: "80px 0 40px",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      <button
        type="button"
        onClick={() => setPage(Math.max(1, page - 1))}
        disabled={page === 1}
        style={{
          fontSize: 13,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: page === 1 ? "var(--text-quaternary)" : "var(--text-primary)",
          cursor: page === 1 ? "not-allowed" : "pointer",
          padding: "6px 0",
          background: "transparent",
          border: "none",
          fontFamily: "inherit",
        }}
      >
        <span style={{ marginRight: 6 }}>←</span> Previous
      </button>
      <div
        style={{
          display: "flex",
          gap: 4,
          alignItems: "center",
          borderLeft: "1px solid var(--border-subtle)",
          borderRight: "1px solid var(--border-subtle)",
          padding: "0 24px",
        }}
      >
        {pages.map((p) => {
          const active = p === page;
          return (
            <button
              key={p}
              type="button"
              onClick={() => setPage(p)}
              style={{
                width: 36,
                height: 36,
                fontSize: 13,
                color: active ? "var(--accent)" : "var(--text-secondary)",
                background: "transparent",
                border: "none",
                borderBottom: `1px solid ${active ? "var(--accent)" : "transparent"}`,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {String(p).padStart(2, "0")}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => setPage(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        style={{
          fontSize: 13,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: page === totalPages ? "var(--text-quaternary)" : "var(--text-primary)",
          cursor: page === totalPages ? "not-allowed" : "pointer",
          padding: "6px 0",
          background: "transparent",
          border: "none",
          fontFamily: "inherit",
        }}
      >
        Next <span style={{ marginLeft: 6 }}>→</span>
      </button>
    </nav>
  );
}

function EmptyState({
  onReset,
  contactHref,
}: {
  onReset: () => void;
  contactHref: string;
}) {
  return (
    <div
      style={{
        padding: "120px 0",
        textAlign: "center",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      <span className="eyebrow gold">No matches</span>
      <h2
        className="serif"
        style={{
          fontSize: "clamp(2rem, 4vw, 3rem)",
          letterSpacing: "-0.03em",
          marginTop: 18,
          lineHeight: 1.05,
        }}
      >
        Nothing on the books that fits —{" "}
        <em style={{ fontStyle: "italic", color: "var(--accent)" }}>yet.</em>
      </h2>
      <p
        style={{
          marginTop: 22,
          fontSize: 16,
          color: "var(--text-secondary)",
          maxWidth: "52ch",
          margin: "22px auto 0",
        }}
      >
        Most of what I sell never makes the public list. Tell me what you&apos;re
        looking for and I&apos;ll see what&apos;s quietly available.
      </p>
      <div style={{ marginTop: 32, display: "flex", gap: 12, justifyContent: "center" }}>
        <button type="button" onClick={onReset} className="btn btn-ghost">
          Reset filters
        </button>
        <Link href={contactHref} className="btn btn-primary">
          Speak with Alexey <span className="arrow">→</span>
        </Link>
      </div>
    </div>
  );
}
