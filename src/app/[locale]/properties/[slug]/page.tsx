import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  PROPERTY_PURPOSE_LABELS,
  PROPERTY_STATUS_LABELS,
  PROPERTY_TYPE_LABELS,
  VIDEO_TYPE_LABELS,
  formatSize,
} from "@/features/properties/constants";
import { TrackPropertyView } from "@/features/analytics/track-property-view";
import { BookingWidgetEditorial } from "@/features/bookings/booking-widget-editorial";
import {
  getBookedDates,
  getPropertyMinStay,
} from "@/features/bookings/queries";
import { getEnabledPaymentOptions } from "@/features/payments/queries";
import { todayIso } from "@/features/rental-calendar/date-utils";
import { getPropertyMessagingLinks } from "@/features/messaging/queries";
import { PropertyChannelLinks } from "@/features/messaging/property-channel-links";
import { MortgageCalculator } from "@/features/properties/mortgage-calculator";
import { PropertyHeroGallery } from "@/features/properties/property-hero-gallery";
import { PropertyViewingForm } from "@/features/properties/property-viewing-form";
import { JsonLd } from "@/features/seo/json-ld";
import {
  breadcrumbJsonLd,
  realEstateListingJsonLd,
} from "@/features/seo/jsonld";
import {
  getPublicProperty,
  getSimilarProperties,
  type PublicPropertyCard,
  type PublicPropertyView,
} from "@/features/properties/queries";
import {
  DEFAULT_CURRENCY,
  isCurrencyCode,
  type CurrencyCode,
} from "@/lib/currency/config";
import { formatCurrency, formatPrice } from "@/lib/currency/format";
import { isLocale, LOCALES, type Locale } from "@/lib/i18n";
import {
  buildCanonicalUrl,
  buildLocalizedPath,
  type LocalizedSlugs,
} from "@/lib/seo";
import { buildLocaleAlternates } from "@/lib/seo/alternates";
import { getPublicSiteContext } from "@/server/public-site";

export const dynamic = "force-dynamic";

function resolveLocale(value: string): Locale {
  return isLocale(value) ? value : "en";
}

function joinParts(...parts: (string | null | undefined)[]): string {
  return parts
    .filter(
      (part): part is string =>
        typeof part === "string" && part.trim() !== "",
    )
    .join(", ");
}

/** Адрес для публичного показа с учётом exact_address_visibility. */
function displayAddress(view: PublicPropertyView): string {
  const location = view.location;
  if (!location) return "";
  const general = joinParts(location.area, location.city, location.country);
  switch (location.exact_address_visibility) {
    case "exact":
      return joinParts(location.address) || location.public_address || general;
    case "approximate":
      return location.public_address || general;
    case "hidden":
      return joinParts(location.city, location.country);
    default:
      return general;
  }
}

/** Преобразует YouTube/Vimeo URL во встраиваемую ссылку или возвращает null. */
function getEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "youtube.com") {
      const id = parsed.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (host === "youtu.be") {
      const id = parsed.pathname.slice(1);
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (host === "vimeo.com") {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
    return null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { locale: string; slug: string };
}): Promise<Metadata> {
  const locale = resolveLocale(params.locale);
  const site = await getPublicSiteContext();
  if (!site) return {};
  const view = await getPublicProperty(
    site.organization.id,
    params.slug,
    locale,
    site.organization.default_language,
  );
  if (!view) return {};

  const slugFor = (target: Locale): string =>
    `/properties/${view.localizedSlugs[target] ?? view.baseSlug}`;
  const slugMap: LocalizedSlugs = {};
  for (const target of LOCALES) {
    slugMap[target] = slugFor(target);
  }
  const path = slugFor(locale);
  const cover =
    view.media.find((item) => item.category === "cover")?.url ??
    view.media[0]?.url;
  const title = view.seoTitle ?? view.title;
  const description =
    view.seoDescription ??
    (view.description ? view.description.slice(0, 160) : undefined);

  return {
    title,
    description,
    alternates: await buildLocaleAlternates(locale, path, slugMap),
    openGraph: {
      title,
      description,
      type: "website",
      url: buildCanonicalUrl(locale, path),
      images: cover ? [{ url: cover }] : undefined,
    },
  };
}

export default async function PropertyDetailPage({
  params,
}: {
  params: { locale: string; slug: string };
}) {
  const locale = resolveLocale(params.locale);
  const site = await getPublicSiteContext();
  if (!site) notFound();

  const view = await getPublicProperty(
    site.organization.id,
    params.slug,
    locale,
    site.organization.default_language,
  );
  if (!view) notFound();

  const property = view.property;
  const similar = await getSimilarProperties(
    site.organization.id,
    property.id,
    property.purpose,
    locale,
    site.organization.default_language,
    3,
  );

  // Галерея: cover первой, затем по sort_order.
  const gallery = [...view.media].sort((a, b) => {
    if (a.category === "cover" && b.category !== "cover") return -1;
    if (b.category === "cover" && a.category !== "cover") return 1;
    return a.sort_order - b.sort_order;
  });

  const priceCurrency: CurrencyCode =
    view.price && isCurrencyCode(view.price.currency)
      ? view.price.currency
      : DEFAULT_CURRENCY;
  const priceText =
    view.price && view.price.displayType === "visible"
      ? formatPrice(
          view.price.amount,
          priceCurrency,
          locale,
          view.price.pricePeriod,
        )
      : null;
  const oldPriceText =
    view.price &&
    view.price.displayType === "visible" &&
    view.price.oldAmount !== null
      ? formatPrice(
          view.price.oldAmount,
          priceCurrency,
          locale,
          view.price.pricePeriod,
        )
      : null;
  const priceLabel = priceText ?? "Price on request";
  // Вторая цена (аренда) для mixed-объектов.
  const rentPriceCurrency: CurrencyCode =
    view.rentPrice && isCurrencyCode(view.rentPrice.currency)
      ? view.rentPrice.currency
      : DEFAULT_CURRENCY;
  const rentPriceText =
    view.rentPrice && view.rentPrice.displayType === "visible"
      ? formatPrice(
          view.rentPrice.amount,
          rentPriceCurrency,
          locale,
          view.rentPrice.pricePeriod,
        )
      : null;

  const address = displayAddress(view);
  const location = view.location;
  // Vacation/short-term — показываем stay-секции вместо buy-метаданных.
  const isBookable =
    property.purpose === "short_term_rental" || property.purpose === "mixed";

  // Spec strip — самые «крупные» 4 факта (beds / baths / size / floor or year).
  type Spec = { label: string; value: string; unit?: string | null };
  const specs: Spec[] = [];
  if (property.bedrooms !== null) {
    specs.push({ label: "Bedrooms", value: String(property.bedrooms) });
  }
  if (property.bathrooms !== null) {
    specs.push({ label: "Bathrooms", value: String(property.bathrooms) });
  }
  if (property.size !== null) {
    specs.push({
      label: "Interior",
      value: String(property.size),
      unit: property.size_unit,
    });
  }
  if (property.guest_capacity !== null) {
    specs.push({ label: "Guests", value: String(property.guest_capacity) });
  } else if (property.floor !== null) {
    specs.push({
      label: "Floor",
      value:
        property.total_floors !== null
          ? `${property.floor} / ${property.total_floors}`
          : String(property.floor),
    });
  } else if (property.year_built !== null) {
    specs.push({ label: "Built", value: String(property.year_built) });
  }

  // Meta-таблица (двух-колоночная).
  const meta: [string, string][] = [];
  meta.push(["Type", PROPERTY_TYPE_LABELS[property.property_type]]);
  meta.push(["Deal", PROPERTY_PURPOSE_LABELS[property.purpose]]);
  if (property.status !== "active") {
    meta.push(["Status", PROPERTY_STATUS_LABELS[property.status]]);
  }
  if (property.year_built !== null && specs.every((s) => s.label !== "Built")) {
    meta.push(["Year built", String(property.year_built)]);
  }
  if (property.floor !== null && specs.every((s) => s.label !== "Floor")) {
    meta.push([
      "Floor",
      property.total_floors !== null
        ? `${property.floor} / ${property.total_floors}`
        : String(property.floor),
    ]);
  }
  if (property.parking !== null) {
    meta.push(["Parking", String(property.parking)]);
  }
  if (property.garage) {
    meta.push(["Garage", "Yes"]);
  }
  if (property.lot_size !== null) {
    meta.push([
      "Lot size",
      formatSize(property.lot_size, property.size_unit),
    ]);
  }
  // Сборы: для buy — в meta-таблицу; для vacation — в секцию «Good to know».
  if (!isBookable) {
    if (view.fees.securityDeposit !== null) {
      meta.push([
        "Security deposit",
        formatCurrency(view.fees.securityDeposit, priceCurrency, locale),
      ]);
    }
    if (view.fees.cleaningFee !== null) {
      meta.push([
        "Cleaning fee",
        formatCurrency(view.fees.cleaningFee, priceCurrency, locale),
      ]);
    }
    if (view.fees.taxes !== null) {
      meta.push(["Taxes", formatCurrency(view.fees.taxes, priceCurrency, locale)]);
    }
  }

  // «Good to know» (vacation) — гости и сборы из реальных данных.
  const stayRules: [string, string][] = [];
  if (isBookable) {
    if (property.guest_capacity !== null) {
      stayRules.push(["Guests", `Up to ${property.guest_capacity}`]);
    }
    if (view.fees.cleaningFee !== null) {
      stayRules.push([
        "Cleaning fee",
        formatCurrency(view.fees.cleaningFee, priceCurrency, locale),
      ]);
    }
    if (view.fees.securityDeposit !== null) {
      stayRules.push([
        "Security deposit",
        formatCurrency(view.fees.securityDeposit, priceCurrency, locale),
      ]);
    }
    if (view.fees.taxes !== null) {
      stayRules.push([
        "Taxes & fees",
        formatCurrency(view.fees.taxes, priceCurrency, locale),
      ]);
    }
  }

  // Описание разбиваем на параграфы по двойному \n
  const descriptionParagraphs = view.description
    ? view.description
        .split(/\n{2,}/g)
        .map((p) => p.trim())
        .filter(Boolean)
    : [];

  // Investment metrics — только то, что можно посчитать из БД.
  // pricePerSqft + listed price.
  const sizeForRate =
    property.size !== null && property.size > 0 ? property.size : null;
  const pricePerUnit =
    view.price && view.price.displayType === "visible" && sizeForRate
      ? Math.round(view.price.amount / sizeForRate)
      : null;
  const showBooking =
    isBookable && view.price !== null && view.price.displayType === "visible";
  // Онлайн-оплата доступна только когда показан booking-виджет.
  const paymentOptions = showBooking
    ? await getEnabledPaymentOptions(site.organization.id)
    : [];
  const saleVisible =
    (property.purpose === "sale" || property.purpose === "mixed") &&
    view.price !== null &&
    view.price.displayType === "visible";
  // Занятые даты + минимальная длительность брони для публичного виджета.
  const [bookedDates, minStay]: [string[], number] = showBooking
    ? await Promise.all([
        getBookedDates(property.id),
        getPropertyMinStay(property.id),
      ])
    : [[], 1];

  // Acquisition cost — ставки настраиваются в brand_settings (white-label);
  // дефолты совпадают с прежними значениями (Дубай).
  const acqBase = view.price ? view.price.amount : 0;
  const transferPct = site.brand?.acq_transfer_pct ?? 4;
  const agencyPct = site.brand?.acq_agency_pct ?? 2;
  const registrationPct = site.brand?.acq_registration_pct ?? 0.25;
  const fmtC = (n: number): string =>
    formatCurrency(Math.round(n), priceCurrency, locale);
  const pctText = (n: number): string => `${n}%`;
  const acquisition: [string, string, string][] = [
    ["Purchase price", fmtC(acqBase), ""],
    ["Transfer fee", fmtC((acqBase * transferPct) / 100), pctText(transferPct)],
    ["Agency fee", fmtC((acqBase * agencyPct) / 100), pctText(agencyPct)],
    [
      "Registration",
      fmtC((acqBase * registrationPct) / 100),
      pctText(registrationPct),
    ],
  ];
  const acquisitionTotalText = fmtC(
    acqBase * (1 + (transferPct + agencyPct + registrationPct) / 100),
  );

  // Краткие детали сделки для sticky-панели (дизайн property-buy) —
  // только реальные поля из БД, ничего не выдумываем.
  const buyDetails: [string, string][] = [];
  if (property.ownership) {
    buyDetails.push(["Ownership", property.ownership]);
  }
  if (property.completion) {
    buyDetails.push(["Status", property.completion]);
  } else if (property.status !== "active") {
    buyDetails.push(["Status", PROPERTY_STATUS_LABELS[property.status]]);
  }
  if (property.rental_yield !== null) {
    buyDetails.push(["Est. net yield", `${property.rental_yield}%`]);
  }

  // Ячейки блока «Investment» — собираем только из доступных данных.
  const investCells: { value: string; label: string; note?: string }[] = [];
  investCells.push({
    value: priceText ?? "—",
    label: "Listed price",
    note:
      view.price?.pricePeriod === "week"
        ? "Weekly"
        : view.price?.pricePeriod === "night"
          ? "Per night"
          : "Asking",
  });
  if (pricePerUnit !== null) {
    investCells.push({
      value: `${formatCurrency(pricePerUnit, priceCurrency, locale)} / ${property.size_unit}`,
      label: "Price per area",
      note: `Based on ${property.size} ${property.size_unit} interior`,
    });
  }
  if (property.rental_yield !== null) {
    investCells.push({
      value: `${property.rental_yield}%`,
      label: "Est. net yield",
      note: "Gross, indicative",
    });
  }

  const canonicalPath = `/properties/${view.localizedSlugs[locale] ?? view.baseSlug}`;
  const canonicalUrl = buildCanonicalUrl(locale, canonicalPath);

  // Deep-link кнопки мессенджеров — входящий чат привяжется к этому объекту.
  const channelLinks = await getPropertyMessagingLinks(
    site.organization.id,
    property.id,
    `${view.title} — ${canonicalUrl}`,
  );
  const jsonLd = [
    realEstateListingJsonLd({
      name: view.title,
      url: canonicalUrl,
      description: view.description,
      images: gallery.slice(0, 5).map((item) => item.url),
      price:
        view.price && view.price.displayType === "visible"
          ? view.price.amount
          : null,
      currency: view.price?.currency ?? null,
      address: address || null,
    }),
    breadcrumbJsonLd([
      { name: "Home", url: buildCanonicalUrl(locale, "/") },
      { name: "Properties", url: buildCanonicalUrl(locale, "/listings") },
      { name: view.title, url: canonicalUrl },
    ]),
  ];

  const heroEyebrow = [
    PROPERTY_TYPE_LABELS[property.property_type],
    location?.city,
    PROPERTY_PURPOSE_LABELS[property.purpose],
  ].filter((s): s is string => Boolean(s));
  const heroBadge =
    property.status !== "active" ? PROPERTY_STATUS_LABELS[property.status] : null;
  const listingsHref = buildLocalizedPath(locale, "/listings");

  return (
    <>
      <JsonLd data={jsonLd} />
      <TrackPropertyView propertyId={property.id} />

      {/* 1) HERO GALLERY ==================================== */}
      <PropertyHeroGallery
        images={gallery.map((m) => ({ url: m.url, alt: m.alt }))}
        title={view.title}
        location={address}
        eyebrow={heroEyebrow}
        badge={heroBadge}
        backHref={listingsHref}
        backLabel="All properties"
      />

      {/* 2) INFO — sticky CTA + body ======================== */}
      <section
        style={{
          background: "var(--bg-primary)",
          padding: "120px 0 100px",
        }}
      >
        <div
          className="ed-info-grid"
          style={{
            maxWidth: "var(--max-w)",
            margin: "0 auto",
            padding: "0 var(--edge-d)",
            display: "grid",
            gridTemplateColumns: "4fr 8fr",
            gap: 64,
            alignItems: "start",
          }}
        >
          {/* Sticky CTA */}
          <aside
            className="ed-sticky-cta"
            style={{ position: "sticky", top: 108, alignSelf: "start" }}
          >
            {showBooking ? (
              <BookingWidgetEditorial
                propertyId={property.id}
                locale={locale}
                nightly={view.price ? view.price.amount : 0}
                currency={priceCurrency}
                cleaningFee={view.fees.cleaningFee}
                minNights={minStay}
                maxGuests={property.guest_capacity}
                bookedDates={bookedDates}
                today={todayIso()}
                paymentOptions={paymentOptions}
              />
            ) : (
              <>
            {/* Price */}
            <div
              style={{
                padding: "32px 0",
                borderTop: "1px solid var(--border-medium)",
                borderBottom: "1px solid var(--border-subtle)",
              }}
            >
              <span className="eyebrow gold">
                {PROPERTY_PURPOSE_LABELS[property.purpose]}
              </span>
              <div
                className="serif tnum"
                style={{
                  marginTop: 12,
                  fontSize: "clamp(2rem, 4vw, 3rem)",
                  letterSpacing: "-0.035em",
                  color: "var(--accent)",
                  lineHeight: 1,
                  fontWeight: 400,
                }}
              >
                {priceLabel}
              </div>
              {oldPriceText ? (
                <div
                  className="tnum"
                  style={{
                    marginTop: 8,
                    fontSize: 13,
                    color: "var(--text-tertiary)",
                    textDecoration: "line-through",
                  }}
                >
                  {oldPriceText}
                </div>
              ) : null}
              {rentPriceText ? (
                <div
                  className="tnum"
                  style={{
                    marginTop: 8,
                    fontSize: 16,
                    color: "var(--text-secondary)",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {rentPriceText}
                  <span
                    style={{
                      marginLeft: 6,
                      fontSize: 12,
                      color: "var(--text-tertiary)",
                      letterSpacing: "0.04em",
                    }}
                  >
                    to rent
                  </span>
                </div>
              ) : null}
              {pricePerUnit !== null ? (
                <div
                  className="tnum"
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    color: "var(--text-tertiary)",
                    letterSpacing: "0.04em",
                  }}
                >
                  {formatCurrency(pricePerUnit, priceCurrency, locale)} /{" "}
                  {property.size_unit}
                </div>
              ) : null}
            </div>

            {/* Deal details */}
            {buyDetails.length > 0 ? (
              <div
                style={{
                  padding: "20px 0",
                  borderBottom: "1px solid var(--border-subtle)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  fontSize: 13,
                }}
              >
                {buyDetails.map(([k, v]) => (
                  <div
                    key={k}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      gap: 16,
                    }}
                  >
                    <span style={{ color: "var(--text-tertiary)" }}>{k}</span>
                    <span className="tnum" style={{ color: "var(--text-primary)" }}>
                      {v}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}

            {/* Agent block */}
            <div
              style={{
                padding: "28px 0",
                borderBottom: "1px solid var(--border-subtle)",
              }}
            >
              <span className="eyebrow">Listed by</span>
              <div
                className="serif"
                style={{
                  marginTop: 6,
                  fontSize: 18,
                  letterSpacing: "-0.02em",
                  color: "var(--text-primary)",
                  fontWeight: 400,
                }}
              >
                {view.agentId && view.agentName ? (
                  <Link
                    href={`/${locale}/agents/${view.agentId}`}
                    style={{ color: "inherit", textDecoration: "none" }}
                  >
                    {view.agentName}
                  </Link>
                ) : (
                  (view.agentName ?? site.organization.name)
                )}
              </div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                  letterSpacing: "0.04em",
                }}
              >
                {site.organization.name}
              </div>
            </div>

            {/* Actions */}
            <div
              style={{
                padding: "28px 0",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <Link
                href="#viewing"
                className="btn btn-solid"
                style={{ justifyContent: "center", padding: "18px 22px" }}
              >
                Request a viewing <span className="arrow">→</span>
              </Link>
              <Link
                href={buildLocalizedPath(locale, "/contact")}
                className="btn btn-ghost"
                style={{ justifyContent: "center", padding: "16px 22px" }}
              >
                Ask a question
              </Link>
            </div>

            {/* Reference */}
            <div
              className="tnum"
              style={{
                paddingTop: 24,
                borderTop: "1px solid var(--border-subtle)",
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                color: "var(--text-tertiary)",
                letterSpacing: "0.04em",
              }}
            >
              <span>Ref. {property.id.slice(0, 8).toUpperCase()}</span>
              <span>
                Listed{" "}
                {new Date(property.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
              </>
            )}
          </aside>

          {/* Body */}
          <div>
            {/* Spec strip */}
            {specs.length > 0 ? (
              <div
                className="ed-spec-strip"
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${specs.length}, 1fr)`,
                  gap: 24,
                  padding: "32px 0",
                  borderTop: "1px solid var(--border-medium)",
                  borderBottom: "1px solid var(--border-subtle)",
                }}
              >
                {specs.map((s) => (
                  <div key={s.label}>
                    <div
                      className="serif tnum"
                      style={{
                        fontSize: "clamp(1.5rem, 2.5vw, 2rem)",
                        letterSpacing: "-0.03em",
                        lineHeight: 1,
                        color: "var(--text-primary)",
                        fontWeight: 400,
                      }}
                    >
                      {s.value}
                      {s.unit ? (
                        <span
                          style={{
                            fontSize: "0.42em",
                            color: "var(--text-tertiary)",
                            marginLeft: 5,
                            fontStyle: "italic",
                            letterSpacing: 0,
                          }}
                        >
                          {s.unit}
                        </span>
                      ) : null}
                    </div>
                    <div
                      style={{
                        marginTop: 8,
                        fontSize: 10.5,
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        color: "var(--text-tertiary)",
                      }}
                    >
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {/* Description */}
            {descriptionParagraphs.length > 0 ? (
              <div style={{ padding: "64px 0", maxWidth: "64ch" }}>
                <span className="eyebrow gold">About this property</span>
                <div style={{ marginTop: 28 }}>
                  {descriptionParagraphs.map((para, i) => (
                    <p
                      key={i}
                      className={i === 0 ? "drop-cap" : ""}
                      style={{
                        fontSize: 17,
                        lineHeight: 1.65,
                        color: "var(--text-secondary)",
                        marginTop: i === 0 ? 0 : 22,
                        whiteSpace: "pre-line",
                      }}
                    >
                      {para}
                    </p>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Meta table */}
            {meta.length > 0 ? (
              <div
                className="ed-meta-grid"
                style={{
                  padding: "32px 0",
                  borderTop: "1px solid var(--border-subtle)",
                  borderBottom: "1px solid var(--border-subtle)",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "20px 60px",
                }}
              >
                {meta.map(([k, v]) => (
                  <div
                    key={k}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      gap: 16,
                      alignItems: "baseline",
                      paddingBottom: 8,
                      borderBottom: "1px dashed var(--border-subtle)",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        color: "var(--text-tertiary)",
                      }}
                    >
                      {k}
                    </span>
                    <span
                      className="serif"
                      style={{
                        fontSize: 16,
                        letterSpacing: "-0.015em",
                        color: "var(--text-primary)",
                        fontWeight: 400,
                      }}
                    >
                      {v}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}

            {/* Financing & acquisition — для sale c видимой ценой */}
            {saleVisible ? (
              <div
                style={{
                  padding: "64px 0",
                  borderTop: "1px solid var(--border-subtle)",
                }}
              >
                <span className="eyebrow gold">Financing</span>
                <h2
                  className="serif"
                  style={{
                    marginTop: 18,
                    marginBottom: 32,
                    fontSize: "var(--text-h3)",
                    letterSpacing: "-0.02em",
                    fontWeight: 400,
                  }}
                >
                  Mortgage calculator
                </h2>
                <MortgageCalculator
                  price={acqBase}
                  currency={priceCurrency}
                  locale={locale}
                />

                <h2
                  className="serif"
                  style={{
                    marginTop: 56,
                    marginBottom: 24,
                    fontSize: "var(--text-h3)",
                    letterSpacing: "-0.02em",
                    fontWeight: 400,
                  }}
                >
                  Total cost of acquisition
                </h2>
                <div
                  style={{
                    maxWidth: 640,
                    borderTop: "1px solid var(--border-medium)",
                  }}
                >
                  {acquisition.map(([label, val, note]) => (
                    <div
                      key={label}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr auto auto",
                        gap: 24,
                        alignItems: "baseline",
                        padding: "14px 0",
                        borderBottom: "1px solid var(--border-subtle)",
                      }}
                    >
                      <span style={{ fontSize: 14, color: "var(--text-primary)" }}>
                        {label}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--text-tertiary)",
                          minWidth: 70,
                          textAlign: "right",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {note}
                      </span>
                      <span
                        className="tnum"
                        style={{
                          fontSize: 14,
                          color: "var(--text-secondary)",
                          minWidth: 140,
                          textAlign: "right",
                        }}
                      >
                        {val}
                      </span>
                    </div>
                  ))}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "18px 0",
                      alignItems: "baseline",
                    }}
                  >
                    <span
                      className="serif"
                      style={{ fontSize: "1.25rem", letterSpacing: "-0.01em" }}
                    >
                      Total acquisition cost
                    </span>
                    <span
                      className="serif tnum"
                      style={{
                        fontSize: "1.5rem",
                        color: "var(--accent)",
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {acquisitionTotalText}
                    </span>
                  </div>
                </div>
                <p
                  style={{
                    marginTop: 16,
                    fontSize: 11,
                    color: "var(--text-tertiary)",
                    lineHeight: 1.5,
                    maxWidth: "60ch",
                  }}
                >
                  Indicative · Dubai-typical fees (4% DLD transfer, ~2% agency,
                  registration). I prepare an exact, itemised statement before
                  you commit.
                </p>
              </div>
            ) : null}

            {/* Features / Amenities */}
            {view.amenities.length > 0 ? (
              <div style={{ padding: "64px 0" }}>
                <span className="eyebrow gold">
                  {isBookable ? "What this place offers" : "Features"}
                </span>
                <ul
                  style={{
                    listStyle: "none",
                    marginTop: 32,
                    padding: 0,
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "0 64px",
                  }}
                  className="ed-features-grid"
                >
                  {view.amenities.map((a) => (
                    <li
                      key={a.id}
                      style={{
                        fontSize: 14,
                        lineHeight: 1.5,
                        color: "var(--text-secondary)",
                        padding: "12px 0",
                        borderBottom: "1px solid var(--border-subtle)",
                        display: "flex",
                        gap: 10,
                      }}
                    >
                      <span style={{ color: "var(--accent)" }}>—</span>
                      {a.name}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/* Videos (если есть) */}
            {view.videos.length > 0 ? (
              <div
                style={{
                  padding: "64px 0",
                  borderTop: "1px solid var(--border-subtle)",
                }}
              >
                <span className="eyebrow gold">Video tours</span>
                <div
                  style={{
                    marginTop: 28,
                    display: "flex",
                    flexDirection: "column",
                    gap: 32,
                  }}
                >
                  {view.videos.map((video) => {
                    const embed = getEmbedUrl(video.url);
                    const label = video.title ?? VIDEO_TYPE_LABELS[video.type];
                    return (
                      <div key={video.id}>
                        <p
                          className="serif"
                          style={{
                            fontSize: 18,
                            color: "var(--text-primary)",
                            marginBottom: 12,
                            letterSpacing: "-0.015em",
                          }}
                        >
                          {label}
                        </p>
                        {embed ? (
                          <div
                            style={{
                              aspectRatio: "16 / 9",
                              border: "1px solid var(--border-subtle)",
                              overflow: "hidden",
                            }}
                          >
                            <iframe
                              src={embed}
                              title={label}
                              allowFullScreen
                              loading="lazy"
                              style={{ width: "100%", height: "100%", border: 0 }}
                            />
                          </div>
                        ) : (
                          <a
                            href={video.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-text"
                            style={{ fontSize: 13, letterSpacing: "0.06em" }}
                          >
                            Open {VIDEO_TYPE_LABELS[video.type].toLowerCase()}{" "}
                            <span className="arrow">→</span>
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* Good to know — vacation (на реальных данных: гости + сборы) */}
            {stayRules.length > 0 ? (
              <div
                style={{
                  padding: "64px 0",
                  borderTop: "1px solid var(--border-subtle)",
                }}
              >
                <span className="eyebrow gold">Good to know</span>
                <div
                  className="ed-features-grid"
                  style={{
                    marginTop: 28,
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "16px 40px",
                  }}
                >
                  {stayRules.map(([k, v]) => (
                    <div
                      key={k}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr auto",
                        gap: 12,
                        alignItems: "baseline",
                        paddingBottom: 10,
                        borderBottom: "1px dashed var(--border-subtle)",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          letterSpacing: "0.16em",
                          textTransform: "uppercase",
                          color: "var(--text-tertiary)",
                        }}
                      >
                        {k}
                      </span>
                      <span
                        className="serif"
                        style={{
                          fontSize: 15,
                          letterSpacing: "-0.01em",
                          color: "var(--text-primary)",
                        }}
                      >
                        {v}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Booking — теперь в sticky-панели слева (showBooking). */}
          </div>
        </div>

        <style>{`
          @media (max-width: 1024px) {
            .ed-info-grid { grid-template-columns: 1fr !important; gap: 48px !important; }
            .ed-sticky-cta { position: static !important; }
            .ed-spec-strip { grid-template-columns: repeat(2, 1fr) !important; }
            .ed-meta-grid { grid-template-columns: 1fr !important; }
            .ed-features-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </section>

      {/* 3) INVESTMENT — только для sale c видимой ценой ===== */}
      {saleVisible ? (
        <section
          style={{
            padding: "120px 0",
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
            <div
              className="ed-section-header"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 60,
                alignItems: "end",
                marginBottom: 56,
              }}
            >
              <div>
                <span className="eyebrow gold">
                  <span className="dot" />
                  The numbers
                </span>
                <h2
                  className="serif"
                  style={{
                    fontSize: "var(--text-h2)",
                    letterSpacing: "-0.035em",
                    marginTop: 20,
                    lineHeight: 1,
                  }}
                >
                  Investment{" "}
                  <em style={{ fontStyle: "italic", color: "var(--accent)" }}>
                    at a glance.
                  </em>
                </h2>
              </div>
              <p
                style={{
                  fontSize: 16,
                  color: "var(--text-secondary)",
                  maxWidth: "42ch",
                  paddingBottom: 12,
                }}
              >
                Listed price and area-derived figures. Detailed comp set and
                yield model available on request.
              </p>
            </div>

            <div
              className="ed-invest-grid"
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${investCells.length}, 1fr)`,
                gap: 0,
                border: "1px solid var(--border-subtle)",
              }}
            >
              {investCells.map((cell, i) => (
                <InvestCell
                  key={cell.label}
                  value={cell.value}
                  label={cell.label}
                  note={cell.note}
                  borderRight={i < investCells.length - 1}
                />
              ))}
            </div>

            <p
              style={{
                marginTop: 28,
                fontSize: 11,
                letterSpacing: "0.04em",
                color: "var(--text-tertiary)",
                maxWidth: "70ch",
              }}
            >
              Past performance does not guarantee future returns. Mortgages and
              structuring available on request.
            </p>
          </div>

          <style>{`
            @media (max-width: 900px) {
              .ed-section-header { grid-template-columns: 1fr !important; gap: 24px !important; }
              .ed-invest-grid { grid-template-columns: 1fr !important; }
            }
          `}</style>
        </section>
      ) : null}

      {/* 5) SIMILAR ========================================= */}
      {similar.length > 0 ? (
        <section
          style={{
            padding: "100px 0 120px",
            background: "var(--bg-secondary)",
            borderTop: "1px solid var(--border-subtle)",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <div
            style={{
              maxWidth: "var(--max-w)",
              margin: "0 auto",
              padding: "0 var(--edge-d)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 56,
                flexWrap: "wrap",
                gap: 24,
              }}
            >
              <div>
                <span className="eyebrow gold">
                  <span className="dot" />
                  You may also consider
                </span>
                <h2
                  className="serif"
                  style={{
                    fontSize: "var(--text-h2)",
                    letterSpacing: "-0.035em",
                    marginTop: 16,
                    lineHeight: 1,
                  }}
                >
                  {similar.length === 1
                    ? "One in the same orbit."
                    : `${similar.length} in the same orbit.`}
                </h2>
              </div>
              <Link
                href={listingsHref}
                className="btn-text"
                style={{
                  fontSize: 13,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                All properties <span className="arrow">→</span>
              </Link>
            </div>

            <div
              className="ed-similar-grid"
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${Math.min(similar.length, 3)}, 1fr)`,
                gap: 32,
              }}
            >
              {similar.map((card) => (
                <SimilarCard key={card.id} card={card} locale={locale} />
              ))}
            </div>
          </div>

          <style>{`
            @media (max-width: 900px) {
              .ed-similar-grid { grid-template-columns: 1fr !important; }
            }
          `}</style>
        </section>
      ) : null}

      {/* 6) CTA — viewing request =========================== */}
      <section
        id="viewing"
        style={{
          padding: "140px 0",
          background: "var(--bg-primary)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <span
          aria-hidden
          className="serif"
          style={{
            position: "absolute",
            left: -40,
            top: 40,
            fontSize: "clamp(16rem, 32vw, 30rem)",
            lineHeight: 0.85,
            color: "var(--accent)",
            opacity: 0.04,
            pointerEvents: "none",
            fontStyle: "italic",
            letterSpacing: "-0.06em",
            fontWeight: 300,
            userSelect: "none",
          }}
        >
          Interested?
        </span>

        <div
          style={{
            maxWidth: "var(--max-w)",
            margin: "0 auto",
            padding: "0 var(--edge-d)",
            position: "relative",
          }}
        >
          <div
            className="ed-cta-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "5fr 7fr",
              gap: 80,
              alignItems: "start",
            }}
          >
            <div>
              <span className="eyebrow gold">
                <span className="dot" />
                Book a viewing
              </span>
              <h2
                className="serif"
                style={{
                  fontSize: "var(--text-h2)",
                  letterSpacing: "-0.04em",
                  marginTop: 22,
                  lineHeight: 0.98,
                }}
              >
                Interested?
                <br />
                <em style={{ fontStyle: "italic", color: "var(--accent)" }}>
                  Let&apos;s talk.
                </em>
              </h2>
              <p
                style={{
                  marginTop: 28,
                  fontSize: 16,
                  color: "var(--text-secondary)",
                  maxWidth: "36ch",
                  lineHeight: 1.55,
                }}
              >
                Viewings are by appointment, weekdays after 10am and weekends
                by request. Out-of-town buyers — full video walk-through can be
                arranged within 24 hours.
              </p>
              <div
                style={{
                  marginTop: 40,
                  paddingTop: 24,
                  borderTop: "1px solid var(--border-subtle)",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    color: "var(--text-tertiary)",
                    marginBottom: 10,
                  }}
                >
                  Or reach directly
                </div>
                <Link
                  href={buildLocalizedPath(locale, "/contact")}
                  className="serif"
                  style={{
                    fontSize: 22,
                    letterSpacing: "-0.015em",
                    color: "var(--text-primary)",
                    fontWeight: 400,
                    textDecoration: "none",
                  }}
                >
                  Direct line & WhatsApp →
                </Link>
                <PropertyChannelLinks links={channelLinks} />
              </div>
            </div>

            <PropertyViewingForm propertyId={property.id} locale={locale} />
          </div>
        </div>

        <style>{`
          @media (max-width: 900px) {
            .ed-cta-grid { grid-template-columns: 1fr !important; gap: 48px !important; }
          }
        `}</style>
      </section>
    </>
  );
}

// ============================================================
//  Similar property card (editorial)
// ============================================================

function SimilarCard({
  card,
  locale,
}: {
  card: PublicPropertyCard;
  locale: Locale;
}) {
  const href = `/${locale}/properties/${card.slug}`;
  const deal = PROPERTY_PURPOSE_LABELS[card.purpose];
  const priceText =
    card.price && card.price.displayType === "visible"
      ? formatPrice(
          card.price.amount,
          isCurrencyCode(card.price.currency)
            ? card.price.currency
            : DEFAULT_CURRENCY,
          locale,
          card.price.pricePeriod,
        )
      : null;
  const location = [card.area, card.city].filter(Boolean).join(" · ");

  return (
    <Link
      href={href}
      className="img-hover"
      style={{
        display: "block",
        color: "inherit",
        textDecoration: "none",
      }}
    >
      <div
        style={{
          aspectRatio: "4 / 3",
          overflow: "hidden",
          position: "relative",
          background: "var(--bg-elevated)",
        }}
      >
        {card.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.coverImageUrl}
            alt={card.title}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : null}
      </div>
      <div style={{ paddingTop: 16 }}>
        <span className="eyebrow gold">{deal}</span>
        <h3
          className="serif"
          style={{
            marginTop: 8,
            fontSize: "clamp(1.2rem, 1.8vw, 1.5rem)",
            letterSpacing: "-0.025em",
            lineHeight: 1.1,
            fontWeight: 400,
            color: "var(--text-primary)",
          }}
        >
          {card.title}
        </h3>
        {location ? (
          <div
            style={{
              marginTop: 6,
              fontSize: 12.5,
              color: "var(--text-secondary)",
            }}
          >
            {location}
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
          {priceText ? (
            <div
              className="serif tnum"
              style={{
                fontSize: "clamp(1.1rem, 1.5vw, 1.45rem)",
                color: "var(--accent)",
                letterSpacing: "-0.02em",
                lineHeight: 1,
              }}
            >
              {priceText}
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

// ============================================================
//  Investment cell
// ============================================================

function InvestCell({
  value,
  label,
  note,
  borderRight,
}: {
  value: string;
  label: string;
  note?: string;
  borderRight?: boolean;
}) {
  return (
    <div
      style={{
        padding: "36px 32px",
        borderRight: borderRight
          ? "1px solid var(--border-subtle)"
          : undefined,
      }}
    >
      <div
        className="serif tnum"
        style={{
          fontSize: "clamp(2rem, 3.5vw, 2.75rem)",
          letterSpacing: "-0.035em",
          color: "var(--accent)",
          lineHeight: 1,
          fontWeight: 400,
        }}
      >
        {value}
      </div>
      <div
        style={{
          marginTop: 14,
          fontSize: 13,
          color: "var(--text-primary)",
          letterSpacing: "-0.005em",
        }}
      >
        {label}
      </div>
      {note ? (
        <div
          style={{
            marginTop: 4,
            fontSize: 11,
            color: "var(--text-tertiary)",
            letterSpacing: "0.04em",
          }}
        >
          {note}
        </div>
      ) : null}
    </div>
  );
}
