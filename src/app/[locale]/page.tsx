import type { Metadata } from "next";
import Link from "next/link";

import { buildPageMetadata } from "@/features/cms/metadata";
import { getHomePage } from "@/features/cms/queries";
import { getHomeContent } from "@/features/home/queries";
import { TestimonialsCarousel } from "@/features/home/testimonials-carousel";
import { getPublicProperties } from "@/features/properties/queries";
import type { PublicPropertyCard } from "@/features/properties/queries";
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

// Фолбэк hero-фоном — если в БД ещё не загружено своё.
const DEFAULT_HERO_IMG =
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=2400&q=85&auto=format&fit=crop";

/** Префиксует internal-ссылки локалью; external/mailto/tel оставляет. */
function localize(href: string | null | undefined, locale: Locale): string {
  if (!href) return buildLocalizedPath(locale, "/");
  if (
    /^https?:\/\//i.test(href) ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:")
  ) {
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

function dealLabelFor(purpose: string): string {
  if (purpose === "sale") return "For sale";
  if (purpose === "long_term_rent") return "Long-term rent";
  if (purpose === "short_term_rental") return "Vacation";
  return "Featured";
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

  const featuredMarket = markets.find((m) => m.is_featured) ?? markets[0] ?? null;
  const smallMarkets = featuredMarket
    ? markets.filter((m) => m.id !== featuredMarket.id)
    : [];

  const aboutMetrics = about
    ? [
        { v: about.metric_1_value, l: about.metric_1_label },
        { v: about.metric_2_value, l: about.metric_2_label },
        { v: about.metric_3_value, l: about.metric_3_label },
        { v: about.metric_4_value, l: about.metric_4_label },
      ].filter((m): m is { v: string; l: string } => Boolean(m.v && m.l))
    : [];

  // Из 5 featured-карточек дизайн использует 5 разных layout-функций A–E.
  // Если в каталоге меньше, рендерим только сколько есть.
  const featured = catalog.items.slice(0, 5);

  return (
    <>
      {siteJsonLd.length > 0 ? <JsonLd data={siteJsonLd} /> : null}

      {/* ============================================================
          HERO — full-screen фото с overlay и нижним fade в cream
          ============================================================ */}
      {hero ? (
        <section
          id="top"
          style={{
            position: "relative",
            minHeight: "100vh",
            background: "var(--bg-primary)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `url(${heroBg})`,
              backgroundSize: "cover",
              backgroundPosition: "center 30%",
              filter: "brightness(0.62) contrast(1.05) saturate(0.85)",
            }}
          />
          {/* Vertical fade: тёмный сверху, cream снизу (под след. секцию) */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(11,11,12,0.45) 0%, rgba(11,11,12,0.0) 30%, rgba(245,244,238,0.0) 55%, rgba(245,244,238,0.85) 90%, rgba(245,244,238,1) 100%)",
            }}
          />
          {/* Horizontal fade слева — для контрастности текста */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(90deg, rgba(11,11,12,0.55) 0%, rgba(11,11,12,0.0) 45%)",
            }}
          />

          <div
            className="on-dark"
            style={{
              position: "relative",
              minHeight: "100vh",
              maxWidth: "var(--max-w)",
              margin: "0 auto",
              padding: "140px var(--edge-d) 220px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
            }}
          >
            <div style={{ marginBottom: 36 }}>
              <span className="eyebrow gold">
                {hero.eyebrow_text}
                {heroChips.map((chip) => (
                  <span key={chip}>
                    <span className="dot" />
                    {chip}
                  </span>
                ))}
              </span>
            </div>

            <h1
              className="serif"
              style={{
                fontSize: "var(--text-display)",
                lineHeight: 0.92,
                letterSpacing: "-0.045em",
                color: "var(--text-primary)",
                maxWidth: "14ch",
                fontWeight: 350,
                marginBottom: 24,
              }}
            >
              {hero.headline_top}
              <br />
              <em
                style={{
                  fontStyle: "italic",
                  fontWeight: 300,
                  color: "var(--accent)",
                  fontVariationSettings: '"SOFT" 100',
                }}
              >
                {hero.headline_bottom_italic}
              </em>
            </h1>

            {hero.subtitle ? (
              <p
                style={{
                  maxWidth: "52ch",
                  fontSize: "var(--text-body-lg)",
                  color: "var(--text-secondary)",
                  lineHeight: 1.55,
                  letterSpacing: "-0.005em",
                  marginBottom: 40,
                }}
              >
                {hero.subtitle}
              </p>
            ) : null}

            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <Link
                href={localize(hero.primary_cta_href, locale)}
                className="btn btn-primary"
              >
                {hero.primary_cta_label}
                <span className="arrow">→</span>
              </Link>
              <Link
                href={localize(hero.secondary_cta_href, locale)}
                className="btn btn-ghost"
              >
                {hero.secondary_cta_label}
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {/* ============================================================
          FEATURED — 5 editorial layouts на реальных объектах из каталога.
          ============================================================ */}
      {featured.length > 0 ? (
        <section
          id="properties"
          style={{
            position: "relative",
            padding: "200px 0 140px",
            background: "var(--bg-primary)",
          }}
        >
          <div
            style={{
              maxWidth: "var(--max-w)",
              margin: "0 auto",
              padding: "0 var(--edge-d)",
              marginBottom: 120,
            }}
          >
            <div
              className="ed-section-header"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 60,
                alignItems: "end",
              }}
            >
              <div>
                <span className="eyebrow gold">
                  <span className="dot" />
                  This week&apos;s selection
                </span>
                <h2
                  className="serif"
                  style={{
                    fontSize: "var(--text-h1)",
                    letterSpacing: "-0.04em",
                    marginTop: 22,
                    lineHeight: 1,
                    maxWidth: "14ch",
                  }}
                >
                  Five rooms worth
                  <br />
                  <em style={{ fontStyle: "italic", color: "var(--accent)" }}>
                    walking through.
                  </em>
                </h2>
              </div>
              <div style={{ paddingBottom: 14 }}>
                <p
                  style={{
                    fontSize: "var(--text-body-lg)",
                    color: "var(--text-secondary)",
                    lineHeight: 1.55,
                    maxWidth: "40ch",
                    marginBottom: 28,
                  }}
                >
                  A short, curated edit — refreshed every Monday. Photographed in
                  daylight, written without superlatives.
                </p>
                <Link
                  href={propertiesHref}
                  className="btn-text"
                  style={{
                    fontSize: 13,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  All listings <span className="arrow">→</span>
                </Link>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 180 }}>
            {featured.map((card, idx) => {
              const props = {
                card,
                idx: String(idx + 1).padStart(2, "0"),
                total: String(featured.length).padStart(2, "0"),
                locale,
              };
              if (idx === 0) return <PropertyA key={card.id} {...props} />;
              if (idx === 1) return <PropertyB key={card.id} {...props} />;
              if (idx === 2) return <PropertyC key={card.id} {...props} />;
              if (idx === 3) return <PropertyD key={card.id} {...props} />;
              return <PropertyE key={card.id} {...props} />;
            })}
          </div>
        </section>
      ) : null}

      {/* ============================================================
          MARKETS — featured hero полной ширины + остальные в равной
          строке. Чистый layout, который масштабируется на 2-5 markets
          без «упавших» карточек.
          ============================================================ */}
      {markets.length > 0 ? (
        <section
          id="markets"
          style={{
            padding: "180px 0 140px",
            background: "var(--bg-primary)",
            position: "relative",
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
                marginBottom: 80,
              }}
            >
              <div>
                <span className="eyebrow gold">
                  <span className="dot" />
                  Markets
                </span>
                <h2
                  className="serif"
                  style={{
                    fontSize: "var(--text-h1)",
                    letterSpacing: "-0.04em",
                    marginTop: 22,
                    lineHeight: 1,
                    maxWidth: "12ch",
                  }}
                >
                  {markets.length === 1 ? "One city," : `${markets.length} cities,`}
                  <br />
                  <em style={{ fontStyle: "italic", color: "var(--accent)" }}>
                    one broker.
                  </em>
                </h2>
              </div>
              <p
                style={{
                  fontSize: "var(--text-body-lg)",
                  color: "var(--text-secondary)",
                  maxWidth: "38ch",
                  paddingBottom: 14,
                  lineHeight: 1.55,
                }}
              >
                Licensed in Dubai. Networked in New York, Toronto, London — through
                partners worked with for years, not lead-trading platforms.
              </p>
            </div>

            <div
              style={{ display: "flex", flexDirection: "column", gap: 24 }}
            >
              {featuredMarket ? (
                <MarketCard
                  market={featuredMarket}
                  featured
                  idx="01"
                  locale={locale}
                />
              ) : null}

              {smallMarkets.length > 0 ? (
                <div
                  className="ed-markets-row"
                  style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${Math.min(smallMarkets.length, 4)}, 1fr)`,
                    gap: 24,
                  }}
                >
                  {smallMarkets.map((m, i) => (
                    <MarketCard
                      key={m.id}
                      market={m}
                      featured={false}
                      idx={String(i + 2).padStart(2, "0")}
                      locale={locale}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <style>{`
            @media (max-width: 1024px) {
              .ed-markets-row {
                grid-template-columns: repeat(2, 1fr) !important;
              }
            }
            @media (max-width: 640px) {
              .ed-markets-row { grid-template-columns: 1fr !important; }
              .ed-section-header { grid-template-columns: 1fr !important; gap: 32px !important; }
            }
          `}</style>
        </section>
      ) : null}

      {/* ============================================================
          ABOUT — портрет 5fr / quote+metrics+body 7fr
          ============================================================ */}
      {about ? (
        <section
          id="about"
          style={{
            background: "var(--bg-secondary)",
            padding: "200px 0 180px",
            position: "relative",
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
            {about.eyebrow_text ? (
              <span className="eyebrow gold">
                <span className="dot" />
                {about.eyebrow_text}
              </span>
            ) : null}

            <div
              className="ed-alexey-grid"
              style={{
                display: "grid",
                gridTemplateColumns: about.portrait_url ? "5fr 7fr" : "1fr",
                gap: 80,
                marginTop: 60,
                alignItems: "start",
              }}
            >
              {about.portrait_url ? (
                <div
                  style={{
                    position: "relative",
                    aspectRatio: "4 / 5",
                    overflow: "hidden",
                    background: "#1A1A1F",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={about.portrait_url}
                    alt={site?.organization.name ?? "Portrait"}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      filter: "grayscale(0.55) contrast(1.05) brightness(0.92)",
                    }}
                  />
                  <div
                    className="on-dark"
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      bottom: 0,
                      padding: "20px 24px",
                      background:
                        "linear-gradient(180deg, rgba(11,11,12,0) 0%, rgba(11,11,12,0.9) 100%)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      fontSize: 11,
                      letterSpacing: "0.18em",
                      color: "var(--text-secondary)",
                    }}
                  >
                    <span>{site?.organization.name}</span>
                    <span style={{ color: "var(--accent)" }}>
                      Dubai, {new Date().getFullYear()}
                    </span>
                  </div>
                </div>
              ) : null}

              <div>
                <blockquote
                  className="serif"
                  style={{
                    fontSize: "clamp(1.75rem, 3.6vw, 3rem)",
                    lineHeight: 1.12,
                    letterSpacing: "-0.03em",
                    color: "var(--text-primary)",
                    fontWeight: 350,
                    margin: 0,
                  }}
                >
                  <span
                    style={{
                      color: "var(--accent)",
                      fontStyle: "italic",
                    }}
                  >
                    “
                  </span>
                  {about.headline}
                  <span
                    style={{
                      color: "var(--accent)",
                      fontStyle: "italic",
                    }}
                  >
                    ”
                  </span>
                </blockquote>
                <div
                  style={{
                    marginTop: 32,
                    fontSize: 12,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "var(--text-tertiary)",
                  }}
                >
                  — {site?.organization.name}
                </div>

                {aboutMetrics.length > 0 ? (
                  <div
                    className="ed-metrics-grid"
                    style={{
                      display: "grid",
                      gridTemplateColumns: `repeat(${aboutMetrics.length}, 1fr)`,
                      gap: 40,
                      marginTop: 80,
                      paddingTop: 48,
                      borderTop: "1px solid var(--border-subtle)",
                    }}
                  >
                    {aboutMetrics.map((m) => (
                      <div key={m.l}>
                        <div
                          className="serif tnum"
                          style={{
                            fontSize: "clamp(2.2rem, 4vw, 3.25rem)",
                            letterSpacing: "-0.035em",
                            lineHeight: 1,
                            color: "var(--text-primary)",
                            fontWeight: 350,
                          }}
                        >
                          {m.v}
                        </div>
                        <div
                          style={{
                            marginTop: 14,
                            fontSize: 12,
                            color: "var(--text-tertiary)",
                            letterSpacing: "0.04em",
                            lineHeight: 1.4,
                          }}
                        >
                          {m.l}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                {about.body ? (
                  <p
                    style={{
                      marginTop: 60,
                      fontSize: 16,
                      lineHeight: 1.7,
                      color: "var(--text-secondary)",
                      maxWidth: "62ch",
                      whiteSpace: "pre-line",
                    }}
                  >
                    {about.body}
                  </p>
                ) : null}

                <div style={{ marginTop: 32 }}>
                  <Link
                    href={aboutHref}
                    className="btn-text"
                    style={{
                      fontSize: 13,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}
                  >
                    Read more about me <span className="arrow">→</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <style>{`
            @media (max-width: 900px) {
              .ed-alexey-grid { grid-template-columns: 1fr !important; gap: 48px !important; }
              .ed-metrics-grid { grid-template-columns: 1fr 1fr !important; gap: 32px !important; }
            }
          `}</style>
        </section>
      ) : null}

      {/* ============================================================
          PROCESS — 4-col строки с большим italic-номером и hover.
          ============================================================ */}
      {process.length > 0 ? (
        <section
          id="process"
          style={{
            background: "var(--bg-primary)",
            padding: "180px 0",
          }}
        >
          <div
            style={{
              maxWidth: "var(--max-w)",
              margin: "0 auto",
              padding: "0 var(--edge-d)",
            }}
          >
            <div style={{ maxWidth: 680, marginBottom: 100 }}>
              <span className="eyebrow gold">
                <span className="dot" />
                The process
              </span>
              <h2
                className="serif"
                style={{
                  fontSize: "var(--text-h1)",
                  letterSpacing: "-0.04em",
                  marginTop: 22,
                  lineHeight: 1,
                }}
              >
                How it
                <br />
                <em style={{ fontStyle: "italic", color: "var(--accent)" }}>
                  actually works.
                </em>
              </h2>
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              {process.map((step, i) => (
                <div
                  key={step.id}
                  className="ed-process-row"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto 1fr 1fr auto",
                    gap: 60,
                    alignItems: "baseline",
                    padding: "48px 0",
                    borderTop: "1px solid var(--border-subtle)",
                    borderBottom:
                      i === process.length - 1
                        ? "1px solid var(--border-subtle)"
                        : "none",
                    transition: "background 500ms var(--ease-out-expo)",
                  }}
                >
                  <div
                    className="serif tnum"
                    style={{
                      fontSize: "clamp(2.5rem, 5vw, 4.5rem)",
                      letterSpacing: "-0.04em",
                      lineHeight: 1,
                      color: "var(--text-quaternary)",
                      transition: "color 500ms var(--ease-out-expo)",
                      fontWeight: 350,
                      minWidth: 120,
                      fontStyle: "italic",
                    }}
                  >
                    {step.step_number}
                  </div>
                  <h3
                    className="serif"
                    style={{
                      fontSize: "clamp(1.5rem, 2.5vw, 2.25rem)",
                      letterSpacing: "-0.03em",
                      color: "var(--text-primary)",
                      lineHeight: 1.05,
                      fontWeight: 350,
                    }}
                  >
                    {step.title}
                  </h3>
                  <p
                    style={{
                      fontSize: 15,
                      color: "var(--text-secondary)",
                      lineHeight: 1.6,
                      maxWidth: "46ch",
                    }}
                  >
                    {step.body}
                  </p>
                  <span
                    aria-hidden
                    style={{
                      fontSize: 22,
                      color: "var(--border-medium)",
                      transition: "all 500ms var(--ease-out-expo)",
                    }}
                  >
                    →
                  </span>
                </div>
              ))}
            </div>
          </div>

          <style>{`
            .ed-process-row:hover {
              background: rgba(139, 115, 64, 0.025);
            }
            .ed-process-row:hover .serif.tnum {
              color: var(--accent) !important;
            }
            .ed-process-row:hover > span:last-child {
              color: var(--accent) !important;
              transform: translateX(6px);
            }
            @media (max-width: 900px) {
              .ed-process-row {
                grid-template-columns: auto 1fr !important;
                gap: 24px !important;
                padding: 32px 0 !important;
              }
              .ed-process-row > p, .ed-process-row > span { grid-column: 1 / -1; }
            }
          `}</style>
        </section>
      ) : null}

      {/* ============================================================
          TRUST + PRESS — горизонтальная строка с разделителем.
          ============================================================ */}
      {trust.length > 0 || press.length > 0 ? (
        <section
          style={{
            background: "var(--bg-primary)",
            padding: "80px 0",
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
            {trust.length > 0 ? (
              <div
                className="ed-trust-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr",
                  gap: 60,
                  alignItems: "center",
                }}
              >
                <span className="eyebrow">
                  Licensed &amp;<br />
                  Featured in
                </span>
                <div
                  className="ed-trust-row"
                  style={{
                    display: "flex",
                    gap: 56,
                    alignItems: "center",
                    flexWrap: "wrap",
                    justifyContent: "space-between",
                  }}
                >
                  {trust.map((t) => (
                    <div key={t.id}>
                      <div
                        className="serif"
                        style={{
                          fontSize: 22,
                          letterSpacing: "-0.02em",
                          color: "var(--text-primary)",
                          lineHeight: 1,
                          fontWeight: 350,
                        }}
                      >
                        {t.label}
                      </div>
                      {t.sub ? (
                        <div
                          style={{
                            marginTop: 6,
                            fontSize: 10.5,
                            letterSpacing: "0.16em",
                            textTransform: "uppercase",
                            color: "var(--text-tertiary)",
                          }}
                        >
                          {t.sub}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {press.length > 0 ? (
              <div
                className="ed-trust-grid"
                style={{
                  marginTop: trust.length > 0 ? 60 : 0,
                  paddingTop: trust.length > 0 ? 40 : 0,
                  borderTop: trust.length > 0 ? "1px dashed var(--border-subtle)" : "none",
                  display: "grid",
                  gridTemplateColumns: "auto 1fr",
                  gap: 60,
                  alignItems: "center",
                }}
              >
                <span className="eyebrow">Featured</span>
                <div
                  style={{
                    display: "flex",
                    gap: 48,
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  {press.map((p) =>
                    p.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={p.id}
                        src={p.logo_url}
                        alt={p.name}
                        style={{ height: 24, width: "auto", opacity: 0.8 }}
                      />
                    ) : (
                      <span
                        key={p.id}
                        className="serif"
                        style={{
                          fontSize: 18,
                          color: "var(--text-secondary)",
                          fontStyle: "italic",
                          letterSpacing: "-0.01em",
                          fontWeight: 350,
                        }}
                      >
                        {p.name}
                      </span>
                    ),
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <style>{`
            @media (max-width: 900px) {
              .ed-trust-grid { grid-template-columns: 1fr !important; gap: 24px !important; }
              .ed-trust-row { gap: 32px !important; }
            }
          `}</style>
        </section>
      ) : null}

      {/* ============================================================
          TESTIMONIALS — одна большая цитата + pagination (client).
          ============================================================ */}
      {testimonials.length > 0 ? (
        <section
          style={{
            background: "var(--bg-primary)",
            padding: "200px 0 180px",
            position: "relative",
          }}
        >
          <div
            style={{
              maxWidth: "var(--max-w)",
              margin: "0 auto",
              padding: "0 var(--edge-d)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <span className="eyebrow gold">
              <span className="dot" />
              What clients say
            </span>
            <TestimonialsCarousel items={testimonials} />
          </div>
        </section>
      ) : null}

      {/* ============================================================
          CTA — split-screen 50/50, слева заголовок+контакты,
          справа — реальная mini-форма-ссылка на /contact.
          ============================================================ */}
      <section
        id="contact"
        style={{
          background: "var(--bg-secondary)",
          padding: "180px 0",
          borderTop: "1px solid var(--border-subtle)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Декоративный гигантский AK на фоне */}
        <span
          aria-hidden
          className="serif"
          style={{
            position: "absolute",
            right: -40,
            top: -120,
            fontSize: "clamp(20rem, 40vw, 36rem)",
            lineHeight: 1,
            color: "var(--accent)",
            opacity: 0.04,
            pointerEvents: "none",
            fontStyle: "italic",
            letterSpacing: "-0.06em",
            fontWeight: 300,
            userSelect: "none",
          }}
        >
          {(site?.organization.name ?? "AK").slice(0, 2).toUpperCase()}
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
              gridTemplateColumns: "1fr 1fr",
              gap: 100,
              alignItems: "start",
            }}
          >
            <div>
              <span className="eyebrow gold">
                <span className="dot" />
                {cta?.eyebrow_text || "Get in touch"}
              </span>
              <h2
                className="serif"
                style={{
                  fontSize: "var(--text-h1)",
                  letterSpacing: "-0.04em",
                  marginTop: 22,
                  lineHeight: 1,
                }}
              >
                {cta?.headline_left || "Tell me what you"}{" "}
                <em style={{ fontStyle: "italic", color: "var(--accent)" }}>
                  {cta?.headline_italic || "actually"}
                </em>{" "}
                {cta?.headline_right || "need."}
              </h2>
              {cta?.subtitle ? (
                <p
                  style={{
                    marginTop: 28,
                    fontSize: 17,
                    color: "var(--text-secondary)",
                    lineHeight: 1.55,
                    maxWidth: "38ch",
                  }}
                >
                  {cta.subtitle}
                </p>
              ) : null}

              <div
                style={{
                  marginTop: 56,
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                }}
              >
                <ContactLine label="Direct" value="One message · one reply" />
                <ContactLine label="Response" value="Within the hour" />
                <ContactLine
                  label="Markets"
                  value="Dubai · NY · Toronto · London"
                />
              </div>
            </div>

            <div>
              <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
                <FieldStatic label="Name" placeholder="Full name" />
                <FieldStatic label="Email" placeholder="you@example.com" />
                <FieldStatic
                  label="Region of interest"
                  placeholder="Dubai, New York, Toronto, London…"
                />
                <FieldStatic
                  label="Message"
                  placeholder="What are you looking for?"
                  textarea
                />
                <div
                  style={{
                    marginTop: 8,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 24,
                    flexWrap: "wrap",
                  }}
                >
                  <p
                    style={{
                      fontSize: 11,
                      letterSpacing: "0.06em",
                      color: "var(--text-tertiary)",
                      maxWidth: "32ch",
                      lineHeight: 1.5,
                      margin: 0,
                    }}
                  >
                    By submitting you agree to be contacted directly. Never
                    shared, never resold.
                  </p>
                  <Link
                    href={contactHref}
                    className="btn btn-solid"
                    style={{
                      padding: "16px 28px",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      fontSize: 12,
                    }}
                  >
                    {cta?.primary_cta_label || "Send"}{" "}
                    <span className="arrow">→</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @media (max-width: 900px) {
            .ed-cta-grid { grid-template-columns: 1fr !important; gap: 60px !important; }
          }
        `}</style>
      </section>
    </>
  );
}

// ============================================================
//  Featured property layouts — 5 разных editorial-вёрсток.
// ============================================================

interface PropLayoutProps {
  card: PublicPropertyCard;
  idx: string;
  total: string;
  locale: Locale;
}

function PriceBlock({
  card,
  small,
  block,
}: {
  card: PublicPropertyCard;
  small?: boolean;
  block?: boolean;
}) {
  if (!card.price) return null;
  const main = formatPrice(card.price.amount, card.price.currency);
  return (
    <div style={{ textAlign: block ? "left" : "right" }}>
      <div
        className="serif tnum"
        style={{
          fontSize: small
            ? "clamp(1.5rem, 2.8vw, 2.25rem)"
            : "clamp(1.75rem, 3.2vw, 2.75rem)",
          letterSpacing: "-0.025em",
          color: "var(--accent)",
          lineHeight: 1,
          fontWeight: 400,
        }}
      >
        {main}
      </div>
    </div>
  );
}

function PropertyMeta({
  card,
  idx,
  total,
  locale,
}: PropLayoutProps) {
  const location = [card.city, card.area].filter(Boolean).join(", ") || "Location on request";
  const specs = [
    card.bedrooms ? `${card.bedrooms} bed` : null,
    card.bathrooms ? `${card.bathrooms} bath` : null,
    card.size ? `${card.size} ${card.sizeUnit}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 18,
        }}
      >
        <span className="eyebrow gold">{dealLabelFor(card.purpose)}</span>
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
          fontSize: "clamp(1.75rem, 3.5vw, 3rem)",
          letterSpacing: "-0.035em",
          lineHeight: 1,
        }}
      >
        {card.title}
      </h3>
      <div
        style={{
          marginTop: 20,
          fontSize: 14,
          color: "var(--text-secondary)",
          lineHeight: 1.5,
        }}
      >
        {location}
        <br />
        {specs}
      </div>
      <div
        style={{
          marginTop: 36,
          paddingTop: 24,
          borderTop: "1px solid var(--border-subtle)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "end",
          gap: 16,
        }}
      >
        <PriceBlock card={card} block />
        <Link
          href={buildLocalizedPath(locale, `/properties/${card.slug}`)}
          className="btn-text"
          style={{ fontSize: 13, letterSpacing: "0.06em" }}
        >
          View details <span className="arrow">→</span>
        </Link>
      </div>
    </div>
  );
}

/** 01 — Full-bleed 21:10, текст наложен снизу-слева, on-dark scope. */
function PropertyA({ card, idx, total, locale }: PropLayoutProps) {
  const href = buildLocalizedPath(locale, `/properties/${card.slug}`);
  const location = [card.city, card.area].filter(Boolean).join(", ") || "Location on request";
  const specs = [
    card.bedrooms ? `${card.bedrooms} bed` : null,
    card.bathrooms ? `${card.bathrooms} bath` : null,
    card.size ? `${card.size} ${card.sizeUnit}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <article style={{ position: "relative", width: "100%" }}>
      <Link
        href={href}
        className="img-hover on-dark"
        style={{
          position: "relative",
          display: "block",
          width: "100%",
          aspectRatio: "21 / 10",
          overflow: "hidden",
        }}
      >
        {card.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.coverImageUrl}
            alt={card.title}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : null}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(11,11,12,0.0) 50%, rgba(11,11,12,0.85) 100%)",
          }}
        />
        {/* Top-right index */}
        <div
          className="tnum"
          style={{
            position: "absolute",
            top: 32,
            right: 40,
            fontSize: 11,
            letterSpacing: "0.22em",
            color: "var(--text-primary)",
          }}
        >
          {idx} <span style={{ opacity: 0.4 }}>/ {total}</span>
        </div>
        {/* Bottom text */}
        <div
          style={{
            position: "absolute",
            left: "max(var(--edge-d), calc((100vw - var(--max-w))/2 + var(--edge-d)))",
            right: "max(var(--edge-d), calc((100vw - var(--max-w))/2 + var(--edge-d)))",
            bottom: 48,
            display: "grid",
            gridTemplateColumns: "1fr auto",
            alignItems: "end",
            gap: 40,
          }}
        >
          <div>
            <span className="eyebrow gold">{dealLabelFor(card.purpose)}</span>
            <h3
              className="serif"
              style={{
                fontSize: "clamp(2rem, 5vw, 4rem)",
                letterSpacing: "-0.035em",
                marginTop: 14,
                lineHeight: 1,
                color: "var(--text-primary)",
              }}
            >
              {card.title}
            </h3>
            <div
              style={{
                marginTop: 18,
                fontSize: 14,
                color: "var(--text-secondary)",
                letterSpacing: "0.01em",
              }}
            >
              {location}
              <span style={{ color: "var(--border-strong)", margin: "0 12px" }}>
                ·
              </span>
              {specs}
            </div>
          </div>
          <PriceBlock card={card} />
        </div>
      </Link>
    </article>
  );
}

/** 02 — Фото 60% слева, meta 40% справа. */
function PropertyB({ card, idx, total, locale }: PropLayoutProps) {
  return (
    <article
      className="ed-prop-2col"
      style={{
        maxWidth: "var(--max-w)",
        margin: "0 auto",
        padding: "0 var(--edge-d)",
        display: "grid",
        gridTemplateColumns: "6fr 4fr",
        gap: 80,
        alignItems: "center",
      }}
    >
      <Link
        href={buildLocalizedPath(locale, `/properties/${card.slug}`)}
        className="img-hover"
        style={{
          display: "block",
          aspectRatio: "5 / 4",
          overflow: "hidden",
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
      </Link>
      <PropertyMeta card={card} idx={idx} total={total} locale={locale} />
    </article>
  );
}

/** 03 — Meta 40% слева, фото 60% справа. */
function PropertyC({ card, idx, total, locale }: PropLayoutProps) {
  return (
    <article
      className="ed-prop-2col"
      style={{
        maxWidth: "var(--max-w)",
        margin: "0 auto",
        padding: "0 var(--edge-d)",
        display: "grid",
        gridTemplateColumns: "4fr 6fr",
        gap: 80,
        alignItems: "center",
      }}
    >
      <PropertyMeta card={card} idx={idx} total={total} locale={locale} />
      <Link
        href={buildLocalizedPath(locale, `/properties/${card.slug}`)}
        className="img-hover"
        style={{
          display: "block",
          aspectRatio: "5 / 4",
          overflow: "hidden",
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
      </Link>
    </article>
  );
}

/** 04 — Диптих фото 7/5 + текст-блок 7/5 снизу. */
function PropertyD({ card, idx, total, locale }: PropLayoutProps) {
  const href = buildLocalizedPath(locale, `/properties/${card.slug}`);
  const location = [card.city, card.area].filter(Boolean).join(", ") || "Location on request";
  const specs = [
    card.bedrooms ? `${card.bedrooms} bed` : null,
    card.bathrooms ? `${card.bathrooms} bath` : null,
    card.size ? `${card.size} ${card.sizeUnit}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <article
      className="ed-prop-2col"
      style={{
        maxWidth: "var(--max-w)",
        margin: "0 auto",
        padding: "0 var(--edge-d)",
        display: "flex",
        flexDirection: "column",
        gap: 32,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "7fr 5fr",
          gap: 24,
        }}
      >
        <Link
          href={href}
          className="img-hover"
          style={{
            display: "block",
            aspectRatio: "5 / 4",
            overflow: "hidden",
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
        </Link>
        <div
          className="img-hover"
          style={{
            aspectRatio: "4 / 5",
            overflow: "hidden",
            background: "var(--bg-tertiary)",
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
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "7fr 5fr",
          gap: 24,
          paddingTop: 8,
        }}
      >
        <div>
          <span className="eyebrow gold">{dealLabelFor(card.purpose)}</span>
          <h3
            className="serif"
            style={{
              fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)",
              letterSpacing: "-0.035em",
              marginTop: 14,
              lineHeight: 1,
            }}
          >
            {card.title}
          </h3>
          <div
            style={{
              marginTop: 16,
              fontSize: 14,
              color: "var(--text-secondary)",
            }}
          >
            {location} · {specs}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "end",
          }}
        >
          <div style={{ alignSelf: "flex-end" }}>
            <div
              className="tnum"
              style={{
                fontSize: 11,
                letterSpacing: "0.22em",
                color: "var(--text-tertiary)",
                marginBottom: 6,
              }}
            >
              {idx} / {total}
            </div>
            <Link
              href={href}
              className="btn-text"
              style={{ fontSize: 13, letterSpacing: "0.06em" }}
            >
              View details <span className="arrow">→</span>
            </Link>
          </div>
          <PriceBlock card={card} small />
        </div>
      </div>
    </article>
  );
}

/** 05 — Full-bleed, текст справа по центру вертикально. */
function PropertyE({ card, idx, total, locale }: PropLayoutProps) {
  const href = buildLocalizedPath(locale, `/properties/${card.slug}`);
  const location = [card.city, card.area].filter(Boolean).join(", ") || "Location on request";
  const specs = [
    card.bedrooms ? `${card.bedrooms} bed` : null,
    card.bathrooms ? `${card.bathrooms} bath` : null,
    card.size ? `${card.size} ${card.sizeUnit}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <article style={{ position: "relative", width: "100%" }}>
      <Link
        href={href}
        className="img-hover on-dark"
        style={{
          position: "relative",
          display: "block",
          width: "100%",
          aspectRatio: "21 / 10",
          overflow: "hidden",
        }}
      >
        {card.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.coverImageUrl}
            alt={card.title}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "brightness(0.78)",
            }}
          />
        ) : null}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(270deg, rgba(11,11,12,0.85) 0%, rgba(11,11,12,0.0) 55%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            right:
              "max(var(--edge-d), calc((100vw - var(--max-w))/2 + var(--edge-d)))",
            top: "50%",
            transform: "translateY(-50%)",
            maxWidth: 440,
          }}
        >
          <div
            className="tnum"
            style={{
              fontSize: 11,
              letterSpacing: "0.22em",
              color: "var(--text-secondary)",
              marginBottom: 18,
            }}
          >
            {idx} / {total}
          </div>
          <span className="eyebrow gold">{dealLabelFor(card.purpose)}</span>
          <h3
            className="serif"
            style={{
              fontSize: "clamp(2rem, 4.5vw, 3.5rem)",
              letterSpacing: "-0.035em",
              marginTop: 14,
              lineHeight: 1,
            }}
          >
            {card.title}
          </h3>
          <div
            style={{
              marginTop: 18,
              fontSize: 14,
              color: "var(--text-secondary)",
              marginBottom: 28,
            }}
          >
            {location}
            <br />
            {specs}
          </div>
          <PriceBlock card={card} block />
          <div style={{ marginTop: 28 }}>
            <span
              className="btn-text"
              style={{ fontSize: 13, letterSpacing: "0.06em" }}
            >
              View property <span className="arrow">→</span>
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}

// ============================================================
//  MARKETS card — Dubai 4:3, остальные 4:5 на on-dark.
// ============================================================

function MarketCard({
  market,
  featured,
  idx,
  locale,
}: {
  market: import("@/features/home/queries").HomeMarket;
  featured: boolean;
  idx: string;
  locale: Locale;
}) {
  return (
    <Link
      href={
        market.href
          ? localize(market.href, locale)
          : buildLocalizedPath(locale, "/properties")
      }
      className={`on-dark img-hover ${featured ? "ed-market-featured" : ""}`}
      style={{
        position: "relative",
        display: "block",
        aspectRatio: featured ? "4 / 3" : "4 / 5",
        overflow: "hidden",
        background: "#0F0F12",
      }}
    >
      {market.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={market.image_url}
          alt={market.name}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "brightness(0.62) saturate(0.85)",
          }}
        />
      ) : null}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(11,11,12,0.2) 0%, rgba(11,11,12,0.0) 35%, rgba(11,11,12,0.85) 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: featured ? 36 : 24,
          left: featured ? 40 : 24,
          right: featured ? 40 : 24,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        {market.region ? (
          <span className="eyebrow gold">{market.region}</span>
        ) : (
          <span />
        )}
        <span
          className="tnum"
          style={{
            fontSize: 11,
            letterSpacing: "0.22em",
            color: "var(--text-secondary)",
          }}
        >
          {idx}
        </span>
      </div>
      <div
        style={{
          position: "absolute",
          left: featured ? 40 : 24,
          right: featured ? 40 : 24,
          bottom: featured ? 36 : 24,
        }}
      >
        <h3
          className="serif"
          style={{
            fontSize: featured
              ? "clamp(3rem, 7vw, 5.5rem)"
              : "clamp(1.75rem, 3vw, 2.75rem)",
            letterSpacing: "-0.04em",
            lineHeight: 0.95,
            color: "var(--text-primary)",
          }}
        >
          {market.name}
        </h3>
        <div
          style={{
            marginTop: featured ? 18 : 10,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "end",
            gap: 24,
          }}
        >
          {market.blurb ? (
            <p
              style={{
                fontSize: featured ? 14 : 12,
                color: "var(--text-secondary)",
                maxWidth: featured ? "40ch" : "28ch",
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              {market.blurb}
            </p>
          ) : (
            <span />
          )}
          {market.badge ? (
            <span
              style={{
                fontSize: 11,
                color: "var(--accent)",
                letterSpacing: "0.12em",
                whiteSpace: "nowrap",
              }}
            >
              {market.badge} →
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

// ============================================================
//  CTA — статические поля (визуально как форма; click → /contact)
// ============================================================

function FieldStatic({
  label,
  placeholder,
  textarea,
}: {
  label: string;
  placeholder: string;
  textarea?: boolean;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 10.5,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "var(--text-tertiary)",
          marginBottom: 12,
        }}
      >
        {label}
      </div>
      <div
        style={{
          borderBottom: "1px solid var(--border-medium)",
          padding: "8px 0 14px",
          color: "var(--text-tertiary)",
          fontSize: 16,
          minHeight: textarea ? 72 : "auto",
        }}
      >
        {placeholder}
      </div>
    </div>
  );
}

function ContactLine({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "120px 1fr",
        gap: 24,
        padding: "14px 0",
        borderBottom: "1px solid var(--border-subtle)",
        alignItems: "baseline",
      }}
    >
      <span
        style={{
          fontSize: 11,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "var(--text-tertiary)",
        }}
      >
        {label}
      </span>
      <span
        className="serif"
        style={{
          fontSize: 18,
          color: "var(--text-primary)",
          letterSpacing: "-0.015em",
          fontWeight: 350,
        }}
      >
        {value}
      </span>
    </div>
  );
}
