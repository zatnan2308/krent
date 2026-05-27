"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { PublicPropertyCard } from "@/features/properties/queries";
import { DEFAULT_CURRENCY, isCurrencyCode } from "@/lib/currency/config";
import { formatPrice } from "@/lib/currency/format";
import {
  PROPERTY_PURPOSE_LABELS,
  formatSize,
} from "@/features/properties/constants";
import type { Locale } from "@/lib/i18n";

interface Props {
  items: PublicPropertyCard[];
  locale: Locale;
  totalShown: number;
  totalAll: number;
  /** URL-action для chips/reset (с локалью). */
  resetHref: string;
  appliedChips: { label: string; clearHref: string }[];
  /** Список вариантов сортировки. Текущая — value. */
  sort: string;
  sortHrefs: { value: string; label: string; href: string }[];
}

type View = "list" | "grid";
type Density = 2 | 3;

function priceTextOf(card: PublicPropertyCard, locale: Locale): string | null {
  const price = card.price;
  if (!price || price.displayType === "hidden") return null;
  if (price.displayType === "upon_request") return "Price on request";
  const currency = isCurrencyCode(price.currency)
    ? price.currency
    : DEFAULT_CURRENCY;
  return formatPrice(price.amount, currency, locale, price.pricePeriod);
}

function locationOf(card: PublicPropertyCard): string {
  return [card.area, card.city].filter(Boolean).join(" · ");
}

function specsOf(card: PublicPropertyCard): string[] {
  const out: string[] = [];
  if (card.bedrooms !== null && card.bedrooms > 0) {
    out.push(`${card.bedrooms} bed`);
  }
  if (card.bathrooms !== null) {
    out.push(`${card.bathrooms} bath`);
  }
  if (card.size !== null) {
    out.push(formatSize(card.size, card.sizeUnit));
  }
  return out;
}

/** Главный клиентский блок: toolbar (chips + sort + view + density) + грид карт. */
export function CatalogEditorialCards({
  items,
  locale,
  totalShown,
  totalAll,
  resetHref,
  appliedChips,
  sort,
  sortHrefs,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [view, setView] = React.useState<View>("list");
  const [density, setDensity] = React.useState<Density>(2);
  const [sortOpen, setSortOpen] = React.useState(false);

  const currentSort =
    sortHrefs.find((option) => option.value === sort) ?? sortHrefs[0]!;
  const total = String(totalShown).padStart(2, "0");

  /** Soft-navigation: меняет URL без full reload + ставит pending. */
  function softNavigate(href: string) {
    startTransition(() => {
      router.replace(href, { scroll: false });
    });
  }

  return (
    <div>
      {/* TOOLBAR */}
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
            Showing{" "}
            <span style={{ color: "var(--text-primary)" }}>{totalShown}</span>{" "}
            of {totalAll} result{totalAll !== 1 ? "s" : ""}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 32,
              flexWrap: "wrap",
            }}
          >
            {/* Sort dropdown */}
            <div
              style={{ position: "relative" }}
              onMouseLeave={() => setSortOpen(false)}
            >
              <button
                type="button"
                onClick={() => setSortOpen((v) => !v)}
                onMouseEnter={() => setSortOpen(true)}
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
                <span style={{ color: "var(--text-tertiary)", marginRight: 4 }}>
                  Sort:
                </span>
                <span>{currentSort.label}</span>
                <span
                  style={{
                    fontSize: 9,
                    color: "var(--text-tertiary)",
                    transform: sortOpen ? "rotate(180deg)" : "none",
                    transition: "transform 300ms",
                  }}
                >
                  ▼
                </span>
              </button>
              {sortOpen ? (
                <div
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
                  {sortHrefs.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setSortOpen(false);
                        softNavigate(option.href);
                      }}
                      style={{
                        display: "block",
                        width: "100%",
                        padding: "12px 18px",
                        textAlign: "left",
                        fontSize: 13,
                        color:
                          option.value === sort
                            ? "var(--accent)"
                            : "var(--text-primary)",
                        letterSpacing: "0.01em",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {/* View toggle */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                borderLeft: "1px solid var(--border-subtle)",
                paddingLeft: 24,
              }}
            >
              {(["list", "grid"] as View[]).map((v) => {
                const active = view === v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setView(v)}
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
                    {v}
                  </button>
                );
              })}
            </div>

            {/* Density (only for grid) */}
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
                {([2, 3] as Density[]).map((d) => {
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

        {appliedChips.length > 0 ? (
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
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
            {appliedChips.map((c) => (
              <button
                key={c.label + c.clearHref}
                type="button"
                onClick={() => softNavigate(c.clearHref)}
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
                <span
                  style={{
                    fontSize: 14,
                    lineHeight: 1,
                    color: "var(--text-tertiary)",
                  }}
                >
                  ×
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => softNavigate(resetHref)}
              style={{
                fontSize: 11,
                letterSpacing: "0.06em",
                color: "var(--text-tertiary)",
                textDecoration: "underline",
                textUnderlineOffset: 3,
                marginLeft: 4,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Reset all
            </button>
          </div>
        ) : null}
      </div>

      {/* RESULTS */}
      <div
        style={{
          opacity: pending ? 0.5 : 1,
          pointerEvents: pending ? "none" : "auto",
          transition: "opacity 200ms var(--ease-out-expo)",
        }}
      >
        {items.length === 0 ? (
          <EmptyState resetHref={resetHref} />
        ) : view === "grid" ? (
          <div
            style={{
              paddingTop: 40,
              display: "grid",
              gridTemplateColumns: `repeat(${density}, 1fr)`,
              gap: "48px 32px",
            }}
            className="ed-grid-view"
          >
            {items.map((card, i) => (
              <EditorialGridCard
                key={card.id}
                card={card}
                locale={locale}
                idx={String(i + 1).padStart(2, "0")}
                total={total}
              />
            ))}
          </div>
        ) : (
          <div>
            {items.map((card, i) => (
              <EditorialListCard
                key={card.id}
                card={card}
                locale={locale}
                idx={String(i + 1).padStart(2, "0")}
                total={total}
              />
            ))}
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 640px) {
          .ed-grid-view { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

// ---- LIST CARD (60/40) ------------------------------------------

function EditorialListCard({
  card,
  locale,
  idx,
  total,
}: {
  card: PublicPropertyCard;
  locale: Locale;
  idx: string;
  total: string;
}) {
  const href = `/${locale}/properties/${card.slug}`;
  const dealLabel = PROPERTY_PURPOSE_LABELS[card.purpose];
  const price = priceTextOf(card, locale);
  const location = locationOf(card);
  const specs = specsOf(card);
  const badge = card.status !== "active" ? card.status : null;

  return (
    <Link
      href={href}
      className="ed-list-card img-hover"
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
        {card.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.coverImageUrl}
            alt={card.title}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : null}
        {badge ? (
          <div
            className="on-dark"
            style={{
              position: "absolute",
              top: 16,
              left: 16,
              fontSize: 10,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--accent)",
              border: "1px solid var(--accent-line)",
              padding: "5px 10px",
              background: "rgba(11,11,12,0.45)",
              backdropFilter: "blur(8px)",
            }}
          >
            {badge}
          </div>
        ) : null}
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
            <span className="eyebrow gold">{dealLabel}</span>
            <span
              className="tnum"
              style={{
                fontSize: 11,
                letterSpacing: "0.22em",
                color: "var(--text-tertiary)",
              }}
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
            {card.title}
          </h3>
          {location ? (
            <div
              style={{
                marginTop: 12,
                fontSize: 13.5,
                color: "var(--text-secondary)",
                letterSpacing: "0.01em",
              }}
            >
              {location}
            </div>
          ) : null}
          {specs.length > 0 ? (
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
            </div>
          ) : null}
        </div>

        <div
          style={{
            marginTop: 32,
            paddingTop: 24,
            borderTop: "1px solid var(--border-subtle)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "end",
            gap: 16,
          }}
        >
          {price ? (
            <div
              className="serif tnum"
              style={{
                fontSize: "clamp(1.5rem, 2.6vw, 2.1rem)",
                letterSpacing: "-0.025em",
                color: "var(--accent)",
                lineHeight: 1,
                fontWeight: 400,
              }}
            >
              {price}
            </div>
          ) : (
            <span />
          )}
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

// ---- GRID CARD (compact) ----------------------------------------

function EditorialGridCard({
  card,
  locale,
  idx,
  total,
}: {
  card: PublicPropertyCard;
  locale: Locale;
  idx: string;
  total: string;
}) {
  const href = `/${locale}/properties/${card.slug}`;
  const dealLabel = PROPERTY_PURPOSE_LABELS[card.purpose];
  const price = priceTextOf(card, locale);
  const location = locationOf(card);
  const specs = specsOf(card);
  const badge = card.status !== "active" ? card.status : null;

  return (
    <Link
      href={href}
      className="img-hover"
      style={{
        display: "block",
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
        {card.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.coverImageUrl}
            alt={card.title}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : null}
        {badge ? (
          <div
            className="on-dark"
            style={{
              position: "absolute",
              top: 14,
              left: 14,
              fontSize: 9.5,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--accent)",
              border: "1px solid var(--accent-line)",
              padding: "4px 8px",
              background: "rgba(11,11,12,0.45)",
              backdropFilter: "blur(8px)",
            }}
          >
            {badge}
          </div>
        ) : null}
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
          <span className="eyebrow gold">{dealLabel}</span>
          <span
            className="tnum"
            style={{
              fontSize: 10.5,
              letterSpacing: "0.22em",
              color: "var(--text-tertiary)",
            }}
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
          }}
        >
          {card.title}
        </h3>
        {location ? (
          <div
            style={{
              marginTop: 8,
              fontSize: 12.5,
              color: "var(--text-secondary)",
            }}
          >
            {location}
          </div>
        ) : null}
        {specs.length > 0 ? (
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
        ) : null}
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
          {price ? (
            <div
              className="serif tnum"
              style={{
                fontSize: "clamp(1.1rem, 1.6vw, 1.5rem)",
                color: "var(--accent)",
                letterSpacing: "-0.02em",
                lineHeight: 1,
                fontWeight: 400,
              }}
            >
              {price}
            </div>
          ) : (
            <span />
          )}
          <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>→</span>
        </div>
      </div>
    </Link>
  );
}

// ---- EMPTY ------------------------------------------------------

function EmptyState({ resetHref }: { resetHref: string }) {
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
        Most of what is sold never makes the public list. Tell us what you&apos;re
        looking for and we&apos;ll see what&apos;s quietly available.
      </p>
      <div
        style={{
          marginTop: 32,
          display: "flex",
          gap: 12,
          justifyContent: "center",
        }}
      >
        <Link href={resetHref} className="btn btn-ghost">
          Reset filters
        </Link>
        <Link href="/contact" className="btn btn-primary">
          Speak with us <span className="arrow">→</span>
        </Link>
      </div>
    </div>
  );
}
