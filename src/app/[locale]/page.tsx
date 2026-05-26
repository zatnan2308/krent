import type { Metadata } from "next";
import Link from "next/link";

import { buildPageMetadata } from "@/features/cms/metadata";
import { getHomePage } from "@/features/cms/queries";
import { getHomeContent } from "@/features/home/queries";
import { getPublicProperties } from "@/features/properties/queries";
import { JsonLd } from "@/features/seo/json-ld";
import {
  organizationJsonLd,
  realEstateAgentJsonLd,
} from "@/features/seo/jsonld";
import { isLocale, type Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n/dictionaries";
import {
  buildCanonicalUrl,
  buildLocaleAlternates,
  buildLocalizedPath,
} from "@/lib/seo";
import { getPublicSiteContext } from "@/server/public-site";

export const dynamic = "force-dynamic";

function resolveLocale(value: string): Locale {
  return isLocale(value) ? value : "en";
}

// Фолбэк для случая, когда контент в БД ещё не заведён.
const DEFAULT_HERO_IMG =
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=2400&q=85&auto=format&fit=crop";

/** Прокидываем locale внутрь internal-ссылок; внешние (http*) оставляем как есть. */
function localize(href: string | null | undefined, locale: Locale): string {
  if (!href) return buildLocalizedPath(locale, "/");
  if (/^https?:\/\//i.test(href) || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return href;
  }
  return buildLocalizedPath(locale, href.startsWith("/") ? href : `/${href}`);
}

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const locale = resolveLocale(params.locale);
  const dictionary = getDictionary(locale);
  const site = await getPublicSiteContext();
  if (site) {
    const home = await getHomePage(
      site.organization.id,
      locale,
      site.organization.default_language,
    );
    if (home) return buildPageMetadata(home, site, locale, "/");
  }
  return {
    title: dictionary.home.title,
    alternates: buildLocaleAlternates(locale, "/"),
  };
}

function formatPrice(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

export default async function LocaleHomePage({
  params,
}: {
  params: { locale: string };
}) {
  const locale = resolveLocale(params.locale);
  const site = await getPublicSiteContext();
  const homeUrl = buildCanonicalUrl(locale, "/");

  const siteJsonLd = site
    ? [
        organizationJsonLd({
          name: site.organization.name,
          url: homeUrl,
          logoUrl: site.brand?.logo_url ?? null,
          description: site.seo?.default_description ?? null,
        }),
        realEstateAgentJsonLd({
          name: site.organization.name,
          url: homeUrl,
          logoUrl: site.brand?.logo_url ?? null,
          description: site.seo?.default_description ?? null,
        }),
      ]
    : [];

  // Параллельно: редактируемый контент главной + 5 свежих объектов из каталога.
  const [content, catalog] = site
    ? await Promise.all([
        getHomeContent(site.organization.id),
        getPublicProperties(
          site.organization.id,
          locale,
          site.organization.default_language,
          {
            purposes: null,
            propertyType: null,
            bedrooms: null,
            bathrooms: null,
            guests: null,
            minPrice: null,
            maxPrice: null,
            city: null,
            area: null,
            amenityIds: [],
            sort: "newest",
            page: 1,
            pageSize: 5,
          },
        ),
      ])
    : [
        {
          hero: null,
          about: null,
          cta: null,
          markets: [],
          process: [],
          testimonials: [],
          trust: [],
          press: [],
        },
        { items: [] },
      ];

  const { hero, about, cta, markets, process, testimonials, trust, press } =
    content;

  const propertiesHref = buildLocalizedPath(locale, "/properties");
  const contactHref = buildLocalizedPath(locale, "/contact");
  const aboutHref = buildLocalizedPath(locale, "/about");

  const heroBg = hero?.background_image_url || DEFAULT_HERO_IMG;
  const heroChips = hero?.eyebrow_chips ?? [];

  // Один из markets может быть помечен как featured — он получает крупный блок.
  const featuredMarket = markets.find((m) => m.is_featured) ?? markets[0] ?? null;
  const smallMarkets = featuredMarket
    ? markets.filter((m) => m.id !== featuredMarket.id)
    : markets;

  const aboutMetrics = about
    ? [
        { v: about.metric_1_value, l: about.metric_1_label },
        { v: about.metric_2_value, l: about.metric_2_label },
        { v: about.metric_3_value, l: about.metric_3_label },
        { v: about.metric_4_value, l: about.metric_4_label },
      ].filter((m): m is { v: string; l: string } =>
        Boolean(m.v && m.l),
      )
    : [];

  return (
    <>
      {siteJsonLd.length > 0 ? <JsonLd data={siteJsonLd} /> : null}

      {/* HERO */}
      {hero ? (
        <section
          className="on-dark relative overflow-hidden"
          style={{ minHeight: "92vh" }}
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${heroBg})`,
              backgroundSize: "cover",
              backgroundPosition: "center 30%",
              filter: "brightness(0.62) contrast(1.05) saturate(0.85)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(11,11,12,0.55) 0%, rgba(11,11,12,0.0) 35%, rgba(245,244,238,0.0) 55%, rgba(245,244,238,0.92) 92%, rgba(245,244,238,1) 100%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, rgba(11,11,12,0.55) 0%, rgba(11,11,12,0.0) 45%)",
            }}
          />

          <div
            className="relative mx-auto flex max-w-[1440px] flex-col justify-end px-5 sm:px-8"
            style={{
              minHeight: "92vh",
              paddingTop: 140,
              paddingBottom: 220,
              color: "var(--ed-text)",
            }}
          >
            <div className="ed-eyebrow mb-9">
              <span style={{ color: "var(--ed-accent)" }}>
                {hero.eyebrow_text}
              </span>
              {heroChips.map((chip) => (
                <span key={chip} className="contents">
                  <span className="dot" />
                  {chip}
                </span>
              ))}
            </div>

            <h1
              className="ed-serif"
              style={{
                fontSize: "clamp(3.5rem, 9vw, 8.5rem)",
                lineHeight: 0.92,
                letterSpacing: "-0.045em",
                maxWidth: "14ch",
                fontWeight: 350,
                marginBottom: 28,
              }}
            >
              {hero.headline_top}
              <br />
              <em
                style={{
                  fontStyle: "italic",
                  fontWeight: 300,
                  color: "var(--ed-accent)",
                }}
              >
                {hero.headline_bottom_italic}
              </em>
            </h1>

            {hero.subtitle ? (
              <p
                style={{
                  maxWidth: "52ch",
                  fontSize: 18,
                  lineHeight: 1.55,
                  color: "var(--ed-text-2)",
                  marginBottom: 36,
                }}
              >
                {hero.subtitle}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <Link
                href={localize(hero.primary_cta_href, locale)}
                className="ed-btn"
              >
                {hero.primary_cta_label} →
              </Link>
              <Link
                href={localize(hero.secondary_cta_href, locale)}
                className="ed-btn ed-btn-ghost"
              >
                {hero.secondary_cta_label}
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {/* FEATURED — реальные объекты из каталога */}
      {catalog.items.length > 0 ? (
        <section className="px-5 py-20 sm:px-8 sm:py-28">
          <div className="mx-auto max-w-[1440px]">
            <div className="mb-12 flex items-end justify-between gap-6">
              <div>
                <p className="ed-eyebrow mb-3">
                  Featured<span className="dot" />Current selection
                </p>
                <h2
                  className="ed-serif"
                  style={{
                    fontSize: "clamp(2rem, 4.5vw, 3.75rem)",
                    lineHeight: 1,
                    letterSpacing: "-0.035em",
                    maxWidth: "16ch",
                  }}
                >
                  Five properties,{" "}
                  <em style={{ fontStyle: "italic", color: "var(--ed-accent)" }}>
                    hand-picked
                  </em>{" "}
                  this week.
                </h2>
              </div>
              <Link
                href={propertiesHref}
                className="ed-btn ed-btn-ghost hidden sm:inline-flex"
              >
                View all →
              </Link>
            </div>

            <ul className="space-y-14">
              {catalog.items.slice(0, 5).map((card, idx) => {
                const reverse = idx % 2 === 1;
                const price = card.price
                  ? formatPrice(card.price.amount, card.price.currency)
                  : null;
                const location =
                  [card.city, card.area].filter(Boolean).join(", ") ||
                  "Location on request";
                const dealLabel =
                  card.purpose === "sale"
                    ? "For sale"
                    : card.purpose === "long_term_rent"
                      ? "Long-term rent"
                      : card.purpose === "short_term_rental"
                        ? "Vacation"
                        : "Featured";
                return (
                  <li key={card.id}>
                    <Link
                      href={buildLocalizedPath(locale, `/properties/${card.slug}`)}
                      className={`grid items-center gap-6 sm:grid-cols-2 sm:gap-12 ${
                        reverse ? "sm:[&>div:first-child]:order-2" : ""
                      }`}
                    >
                      <div className="aspect-[4/3] w-full overflow-hidden">
                        {card.coverImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={card.coverImageUrl}
                            alt={card.title}
                            className="h-full w-full object-cover transition-transform duration-700 hover:scale-[1.03]"
                          />
                        ) : (
                          <div
                            className="h-full w-full"
                            style={{ background: "var(--ed-bg-2)" }}
                          />
                        )}
                      </div>
                      <div>
                        <p
                          className="ed-eyebrow mb-3"
                          style={{ color: "var(--ed-accent)" }}
                        >
                          {dealLabel}
                        </p>
                        <h3
                          className="ed-serif mb-2"
                          style={{
                            fontSize: "clamp(1.5rem, 3vw, 2.25rem)",
                            lineHeight: 1.1,
                            letterSpacing: "-0.02em",
                          }}
                        >
                          {card.title}
                        </h3>
                        <p className="mb-4" style={{ color: "var(--ed-text-3)" }}>
                          {location}
                        </p>
                        <p
                          className="mb-6 text-sm"
                          style={{ color: "var(--ed-text-2)" }}
                        >
                          {[
                            card.bedrooms ? `${card.bedrooms} bed` : null,
                            card.bathrooms ? `${card.bathrooms} bath` : null,
                            card.size ? `${card.size} ${card.sizeUnit}` : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                        {price ? (
                          <p
                            className="ed-serif text-2xl"
                            style={{ color: "var(--ed-accent)" }}
                          >
                            {price}
                          </p>
                        ) : null}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      ) : null}

      {/* MARKETS */}
      {markets.length > 0 ? (
        <section
          className="border-t px-5 py-20 sm:px-8 sm:py-28"
          style={{ borderColor: "var(--ed-border)" }}
        >
          <div className="mx-auto max-w-[1440px]">
            <div className="mb-12">
              <p className="ed-eyebrow mb-3">
                Markets<span className="dot" />
                {markets.length === 1
                  ? "One market"
                  : `${markets.length} markets`}
              </p>
              <h2
                className="ed-serif"
                style={{
                  fontSize: "clamp(2rem, 4.5vw, 3.75rem)",
                  lineHeight: 1,
                  letterSpacing: "-0.035em",
                  maxWidth: "20ch",
                }}
              >
                From the Marina to Mayfair —{" "}
                <em style={{ fontStyle: "italic", color: "var(--ed-accent)" }}>
                  handled directly
                </em>
                .
              </h2>
            </div>

            <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
              {featuredMarket ? (
                <Link
                  href={localize(featuredMarket.href ?? "/properties", locale)}
                  className="group relative block aspect-[16/10] overflow-hidden lg:row-span-2 lg:aspect-auto"
                  style={{ background: "var(--ed-bg-2)" }}
                >
                  {featuredMarket.image_url ? (
                    <div
                      className="absolute inset-0 transition-transform duration-700 group-hover:scale-105"
                      style={{
                        backgroundImage: `url(${featuredMarket.image_url})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                    {featuredMarket.badge ? (
                      <p
                        className="ed-eyebrow mb-2"
                        style={{ color: "rgba(245,244,238,0.7)" }}
                      >
                        {featuredMarket.badge}
                      </p>
                    ) : null}
                    <h3
                      className="ed-serif mb-2"
                      style={{
                        fontSize: "clamp(2rem, 4vw, 3.5rem)",
                        lineHeight: 1,
                      }}
                    >
                      {featuredMarket.name}
                    </h3>
                    {featuredMarket.blurb ? (
                      <p
                        className="max-w-md text-sm"
                        style={{ color: "rgba(245,244,238,0.78)" }}
                      >
                        {featuredMarket.blurb}
                      </p>
                    ) : null}
                  </div>
                </Link>
              ) : null}

              {smallMarkets.map((market) => (
                <Link
                  key={market.id}
                  href={localize(market.href ?? "/properties", locale)}
                  className="group relative block aspect-[16/10] overflow-hidden"
                  style={{ background: "var(--ed-bg-2)" }}
                >
                  {market.image_url ? (
                    <div
                      className="absolute inset-0 transition-transform duration-700 group-hover:scale-105"
                      style={{
                        backgroundImage: `url(${market.image_url})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                    <h3
                      className="ed-serif"
                      style={{ fontSize: "1.5rem", lineHeight: 1.1 }}
                    >
                      {market.name}
                    </h3>
                    {market.region ? (
                      <p
                        className="text-xs"
                        style={{ color: "rgba(245,244,238,0.7)" }}
                      >
                        {market.region}
                      </p>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ABOUT */}
      {about ? (
        <section
          className="border-t px-5 py-20 sm:px-8 sm:py-28"
          style={{
            borderColor: "var(--ed-border)",
            background: "var(--ed-bg-2)",
          }}
        >
          <div className="mx-auto grid max-w-[1440px] items-center gap-12 lg:grid-cols-[2fr_3fr]">
            {about.portrait_url ? (
              <div className="aspect-[4/5] w-full overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={about.portrait_url}
                  alt={site?.organization.name ?? "Portrait"}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : null}
            <div className={about.portrait_url ? "" : "lg:col-span-2"}>
              {about.eyebrow_text ? (
                <p className="ed-eyebrow mb-3">{about.eyebrow_text}</p>
              ) : null}
              <h2
                className="ed-serif mb-8"
                style={{
                  fontSize: "clamp(2rem, 4vw, 3.25rem)",
                  lineHeight: 1.05,
                  letterSpacing: "-0.025em",
                }}
              >
                {about.headline}
              </h2>
              {about.body ? (
                <p
                  className="mb-8 max-w-xl whitespace-pre-line text-[17px] leading-relaxed"
                  style={{ color: "var(--ed-text-2)" }}
                >
                  {about.body}
                </p>
              ) : null}
              {aboutMetrics.length > 0 ? (
                <ul className="grid max-w-md grid-cols-2 gap-x-8 gap-y-6">
                  {aboutMetrics.map((m) => (
                    <li key={m.l}>
                      <p
                        className="ed-serif"
                        style={{
                          fontSize: "2.25rem",
                          lineHeight: 1,
                          color: "var(--ed-accent)",
                        }}
                      >
                        {m.v}
                      </p>
                      <p
                        className="mt-1 text-xs uppercase tracking-wider"
                        style={{ color: "var(--ed-text-3)" }}
                      >
                        {m.l}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {/* PROCESS */}
      {process.length > 0 ? (
        <section
          className="border-t px-5 py-20 sm:px-8 sm:py-28"
          style={{ borderColor: "var(--ed-border)" }}
        >
          <div className="mx-auto max-w-[1440px]">
            <div className="mb-12">
              <p className="ed-eyebrow mb-3">
                Process<span className="dot" />
                {process.length === 1
                  ? "One step"
                  : `${process.length} steps`}
              </p>
              <h2
                className="ed-serif"
                style={{
                  fontSize: "clamp(2rem, 4.5vw, 3.5rem)",
                  lineHeight: 1.05,
                  letterSpacing: "-0.025em",
                  maxWidth: "20ch",
                }}
              >
                How a deal{" "}
                <em style={{ fontStyle: "italic", color: "var(--ed-accent)" }}>
                  actually
                </em>{" "}
                happens.
              </h2>
            </div>

            <ol className="space-y-10">
              {process.map((step) => (
                <li
                  key={step.id}
                  className="grid gap-6 border-t pt-8 sm:grid-cols-[120px_1fr] sm:gap-12"
                  style={{ borderColor: "var(--ed-border)" }}
                >
                  <p
                    className="ed-serif italic"
                    style={{
                      fontSize: "3rem",
                      color: "var(--ed-accent)",
                      lineHeight: 1,
                    }}
                  >
                    {step.step_number}
                  </p>
                  <div>
                    <h3
                      className="ed-serif mb-3"
                      style={{
                        fontSize: "clamp(1.5rem, 2.5vw, 2rem)",
                        lineHeight: 1.1,
                      }}
                    >
                      {step.title}
                    </h3>
                    {step.body ? (
                      <p
                        className="max-w-2xl text-[16px] leading-relaxed"
                        style={{ color: "var(--ed-text-2)" }}
                      >
                        {step.body}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      ) : null}

      {/* TRUST + PRESS */}
      {trust.length > 0 || press.length > 0 ? (
        <section
          className="border-t px-5 py-16 sm:px-8 sm:py-20"
          style={{
            borderColor: "var(--ed-border)",
            background: "var(--ed-bg-2)",
          }}
        >
          <div className="mx-auto max-w-[1440px]">
            {trust.length > 0 ? (
              <>
                <p className="ed-eyebrow mb-6">
                  Licensed &amp; verified<span className="dot" />
                  {trust.length === 1
                    ? "1 jurisdiction"
                    : `${trust.length} jurisdictions`}
                </p>
                <ul className="grid grid-cols-2 gap-6 sm:grid-cols-5">
                  {trust.map((t) => (
                    <li
                      key={t.id}
                      className="border-l pl-4"
                      style={{ borderColor: "var(--ed-accent)" }}
                    >
                      <p
                        className="ed-serif text-xl"
                        style={{ color: "var(--ed-text)" }}
                      >
                        {t.label}
                      </p>
                      {t.sub ? (
                        <p
                          className="text-xs"
                          style={{ color: "var(--ed-text-3)" }}
                        >
                          {t.sub}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}

            {press.length > 0 ? (
              <div
                className={`${trust.length > 0 ? "mt-10 border-t pt-6" : ""}`}
                style={{ borderColor: "var(--ed-border)" }}
              >
                <p className="ed-eyebrow mb-4">As seen in</p>
                <div
                  className="flex flex-wrap items-center gap-x-10 gap-y-3 text-sm"
                  style={{ color: "var(--ed-text-3)" }}
                >
                  {press.map((p) =>
                    p.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={p.id}
                        src={p.logo_url}
                        alt={p.name}
                        className="h-6 w-auto opacity-80"
                      />
                    ) : (
                      <span key={p.id} className="ed-serif italic">
                        {p.name}
                      </span>
                    ),
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* TESTIMONIALS */}
      {testimonials.length > 0 ? (
        <section
          className="border-t px-5 py-20 sm:px-8 sm:py-28"
          style={{ borderColor: "var(--ed-border)" }}
        >
          <div className="mx-auto max-w-[1100px]">
            {testimonials.map((t) => (
              <figure key={t.id} className="mb-16 last:mb-0">
                <p
                  className="ed-serif"
                  style={{
                    fontSize: "clamp(1.5rem, 3vw, 2.25rem)",
                    lineHeight: 1.3,
                    letterSpacing: "-0.015em",
                    fontStyle: "italic",
                    fontWeight: 350,
                  }}
                >
                  {`“${t.quote}”`}
                </p>
                {t.author_name || t.deal_label ? (
                  <figcaption
                    className="mt-6 text-sm"
                    style={{ color: "var(--ed-text-3)" }}
                  >
                    —{" "}
                    {t.author_name ? (
                      <strong style={{ color: "var(--ed-text)" }}>
                        {t.author_name}
                      </strong>
                    ) : null}
                    {t.author_name && t.deal_label ? " · " : ""}
                    {t.deal_label ?? ""}
                  </figcaption>
                ) : null}
              </figure>
            ))}
          </div>
        </section>
      ) : null}

      {/* CTA */}
      {cta ? (
        <section
          className="border-t px-5 py-24 sm:px-8 sm:py-32"
          style={{
            borderColor: "var(--ed-border)",
            background: "var(--ed-bg-2)",
          }}
        >
          <div className="mx-auto max-w-[1000px] text-center">
            {cta.eyebrow_text ? (
              <p className="ed-eyebrow mb-4">
                {cta.eyebrow_text}
                <span className="dot" />
                Available now
              </p>
            ) : null}
            <h2
              className="ed-serif mb-8"
              style={{
                fontSize: "clamp(2.5rem, 6vw, 5rem)",
                lineHeight: 0.95,
                letterSpacing: "-0.035em",
              }}
            >
              {cta.headline_left}{" "}
              <em style={{ fontStyle: "italic", color: "var(--ed-accent)" }}>
                {cta.headline_italic}
              </em>{" "}
              {cta.headline_right}
            </h2>
            {cta.subtitle ? (
              <p
                className="mx-auto mb-10 max-w-xl text-[17px] leading-relaxed"
                style={{ color: "var(--ed-text-2)" }}
              >
                {cta.subtitle}
              </p>
            ) : null}
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href={localize(cta.primary_cta_href, locale)}
                className="ed-btn"
              >
                {cta.primary_cta_label} →
              </Link>
              <Link
                href={localize(cta.secondary_cta_href, locale)}
                className="ed-btn ed-btn-ghost"
              >
                {cta.secondary_cta_label}
              </Link>
            </div>
          </div>
        </section>
      ) : (
        // Минимальный CTA, если контент ещё не настроен в админке.
        <section
          className="border-t px-5 py-24 sm:px-8 sm:py-32"
          style={{
            borderColor: "var(--ed-border)",
            background: "var(--ed-bg-2)",
          }}
        >
          <div className="mx-auto max-w-[1000px] text-center">
            <h2
              className="ed-serif mb-8"
              style={{
                fontSize: "clamp(2.5rem, 6vw, 5rem)",
                lineHeight: 0.95,
                letterSpacing: "-0.035em",
              }}
            >
              Speak with us.
            </h2>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href={contactHref} className="ed-btn">
                Get in touch →
              </Link>
              <Link href={aboutHref} className="ed-btn ed-btn-ghost">
                About
              </Link>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
