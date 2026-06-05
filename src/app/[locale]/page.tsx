import type { Metadata } from "next";
import Link from "next/link";

import { buildPageMetadata } from "@/features/cms/metadata";
import { getHomePage } from "@/features/cms/queries";
import { getHomeContent } from "@/features/home/queries";
import type { HomeSectionsMap } from "@/features/home/queries";
import { SubscribeBand } from "@/features/home/subscribe-band";
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
  buildLocalizedPath,
} from "@/lib/seo";
import { buildLocaleAlternates } from "@/lib/seo/alternates";
import { getPublicSiteContext } from "@/server/public-site";

export const dynamic = "force-dynamic";

function resolveLocale(value: string): Locale {
  return isLocale(value) ? value : "en";
}

// Фолбэк hero-фоном — тёмное фото Дубая, если в БД ещё ничего не загружено.
const DEFAULT_HERO_IMG =
  "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=2400&q=85&auto=format&fit=crop";

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
    alternates: await buildLocaleAlternates(locale, "/"),
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

/** Бейдж сделки для карточки объекта. */
function dealBadge(purpose: string): string {
  if (purpose === "sale") return "For Sale";
  if (purpose === "long_term_rent") return "For Lease";
  if (purpose === "short_term_rental") return "Vacation";
  return "Featured";
}

/** Период цены (/mo, /night) — по назначению объекта. */
function priceCycle(purpose: string): string | null {
  if (purpose === "long_term_rent") return "/mo";
  if (purpose === "short_term_rental") return "/night";
  return null;
}

/** Достаёт заголовок секции из map с фолбэком на дефолты дизайна. */
interface SectionCopy {
  eyebrow: string | null;
  lead: string | null;
  accent: string | null;
  subtitle: string | null;
  imageUrl: string | null;
}
function sectionCopy(
  sections: HomeSectionsMap,
  key: string,
  fallback: Partial<SectionCopy>,
): SectionCopy {
  const s = sections[key];
  return {
    eyebrow: s?.eyebrow ?? fallback.eyebrow ?? null,
    lead: s?.lead ?? fallback.lead ?? null,
    accent: s?.accent ?? fallback.accent ?? null,
    subtitle: s?.subtitle ?? fallback.subtitle ?? null,
    imageUrl: s?.image_url ?? fallback.imageUrl ?? null,
  };
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
            pageSize: 6,
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
          sections: {} as HomeSectionsMap,
          intent: [],
          reasons: [],
          stats: [],
        },
        { items: [] as PublicPropertyCard[] },
      ];

  const {
    hero,
    about,
    cta,
    markets,
    process: processSteps,
    testimonials,
    trust,
    press,
    sections,
    intent,
    reasons,
    stats,
  } = content;

  const featured = catalog.items.slice(0, 6);
  const heroBg = hero?.background_image_url || DEFAULT_HERO_IMG;

  const intentCopy = sectionCopy(sections, "intent", {
    eyebrow: "Where to begin",
    lead: "How can I",
    accent: "help you?",
  });
  const featuredCopy = sectionCopy(sections, "featured", {
    eyebrow: "On the market",
    lead: "Featured",
    accent: "listings",
  });
  const whyCopy = sectionCopy(sections, "why", {
    eyebrow: "The difference",
    lead: "Why work with",
    accent: "Alexey",
  });
  const processCopy = sectionCopy(sections, "process", {
    eyebrow: "How it works",
    lead: "A clear",
    accent: "process",
  });
  const communitiesCopy = sectionCopy(sections, "communities", {
    eyebrow: "Where I work",
    lead: "Featured",
    accent: "neighbourhoods",
  });
  const storiesCopy = sectionCopy(sections, "stories", {
    eyebrow: "In their words",
    lead: "Success",
    accent: "stories",
  });
  const subscribeCopy = sectionCopy(sections, "subscribe", {
    eyebrow: "Stay close to the market",
    lead: "Quarterly market",
    accent: "reports",
    subtitle: "Four issues a year — written by Alexey, no filler, no spam.",
  });

  return (
    <>
      {siteJsonLd.length > 0 ? <JsonLd data={siteJsonLd} /> : null}

      {/* ============================================================
          1 · HERO — full-bleed фото Дубая, текст по центру.
          ============================================================ */}
      {hero ? (
        <section
          id="top"
          className="on-dark"
          style={{
            position: "relative",
            height: "100vh",
            minHeight: 600,
            overflow: "hidden",
            background: "#0F0F12",
          }}
        >
          <div
            className="v3-hero-bg"
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `url(${heroBg})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "brightness(0.66)",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(11,11,12,0.45) 0%, rgba(11,11,12,0.05) 30%, rgba(11,11,12,0.1) 55%, rgba(11,11,12,0.75) 100%)",
            }}
          />
          <div
            style={{
              position: "relative",
              height: "100%",
              maxWidth: "var(--max-w)",
              margin: "0 auto",
              padding: "0 var(--edge-d)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
            }}
          >
            <div
              className="v3-hero-in"
              style={{
                fontSize: 12,
                letterSpacing: "0.34em",
                textTransform: "uppercase",
                color: "rgba(245,244,238,0.85)",
                marginBottom: 28,
              }}
            >
              {hero.eyebrow_text}
            </div>
            <h1
              className="serif v3-hero-in"
              style={{
                fontSize: "clamp(2.75rem, 7vw, 6rem)",
                letterSpacing: "-0.03em",
                lineHeight: 0.98,
                color: "#F5F4EE",
                fontWeight: 400,
                maxWidth: "16ch",
                textWrap: "balance",
              }}
            >
              {hero.headline_top}
              <br />
              <em style={{ fontStyle: "italic", color: "var(--accent)" }}>
                {hero.headline_bottom_italic}
              </em>
            </h1>
            {hero.subtitle ? (
              <p
                className="v3-hero-in"
                style={{
                  marginTop: 26,
                  fontSize: "clamp(1rem, 1.4vw, 1.125rem)",
                  color: "rgba(245,244,238,0.82)",
                  maxWidth: "48ch",
                  lineHeight: 1.55,
                }}
              >
                {hero.subtitle}
              </p>
            ) : null}
            <div
              className="v3-hero-in"
              style={{
                marginTop: 40,
                display: "flex",
                gap: 14,
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              <Link
                href={localize(hero.primary_cta_href, locale)}
                className="btn btn-solid"
              >
                {hero.primary_cta_label} <span className="arrow">→</span>
              </Link>
              <Link
                href={localize(hero.secondary_cta_href, locale)}
                className="btn btn-ghost"
              >
                {hero.secondary_cta_label}
              </Link>
            </div>
          </div>

          {/* Scroll cue */}
          <div
            style={{
              position: "absolute",
              bottom: 32,
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
              opacity: 0.8,
            }}
          >
            <span
              style={{
                fontSize: 10,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                color: "rgba(245,244,238,0.7)",
              }}
            >
              Scroll
            </span>
            <span
              style={{ width: 1, height: 40, background: "rgba(245,244,238,0.4)" }}
            />
          </div>

          <style>{`
            @keyframes v3HeroZoom { from { transform: scale(1.08); } to { transform: scale(1); } }
            @keyframes v3HeroIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
            .v3-hero-bg { animation: v3HeroZoom 2600ms var(--ease-out-expo); }
            .v3-hero-in { animation: v3HeroIn 1000ms var(--ease-out-expo) backwards; }
            .v3-hero-in:nth-of-type(1) { animation-delay: 180ms; }
          `}</style>
        </section>
      ) : null}

      {/* ============================================================
          2 · INTENT — "How can I help you?" (3 карточки)
          ============================================================ */}
      {intent.length > 0 ? (
        <section
          style={{
            background: "var(--bg-primary)",
            padding: "clamp(72px, 8vw, 110px) 0",
          }}
        >
          <div
            style={{ maxWidth: "var(--max-w)", margin: "0 auto", padding: "0 var(--edge-d)" }}
          >
            <SectionTitle copy={intentCopy} />
            <div
              className="v3-intent"
              style={{
                marginTop: "clamp(40px, 5vw, 64px)",
                display: "grid",
                gridTemplateColumns: `repeat(${Math.min(intent.length, 3)}, 1fr)`,
                gap: 1,
                background: "var(--border-subtle)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              {intent.map((option, i) => (
                <Link
                  key={option.id}
                  href={localize(option.href, locale)}
                  className="v3-intent-card"
                  style={{
                    background: "var(--bg-elevated)",
                    padding: "clamp(32px, 3.4vw, 52px)",
                    display: "flex",
                    flexDirection: "column",
                    color: "inherit",
                    minHeight: 220,
                  }}
                >
                  <span
                    className="serif tnum"
                    style={{
                      fontSize: 13,
                      letterSpacing: "0.04em",
                      color: "var(--accent)",
                      marginBottom: 22,
                    }}
                  >
                    0{i + 1}
                  </span>
                  <h3
                    className="serif"
                    style={{
                      fontSize: "clamp(1.5rem, 2.4vw, 2rem)",
                      letterSpacing: "-0.02em",
                      fontWeight: 400,
                      lineHeight: 1.05,
                    }}
                  >
                    {option.title}
                  </h3>
                  {option.description ? (
                    <p
                      style={{
                        marginTop: 14,
                        fontSize: 14.5,
                        color: "var(--text-secondary)",
                        lineHeight: 1.55,
                        maxWidth: "32ch",
                      }}
                    >
                      {option.description}
                    </p>
                  ) : null}
                  <span
                    className="v3-intent-more"
                    style={{
                      marginTop: "auto",
                      paddingTop: 24,
                      fontSize: 12,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    Continue →
                  </span>
                </Link>
              ))}
            </div>
          </div>
          <style>{`
            .v3-intent-card { transition: background 400ms var(--ease-out-expo); }
            .v3-intent-card:hover { background: var(--bg-secondary); }
            .v3-intent-card:hover .v3-intent-more { color: var(--accent); transform: translateX(4px); }
            .v3-intent-more { transition: all 400ms var(--ease-out-expo); }
            @media (max-width: 760px) { .v3-intent { grid-template-columns: 1fr !important; } }
          `}</style>
        </section>
      ) : null}

      {/* ============================================================
          3 · FEATURED — реальные объекты из каталога (топ-6)
          ============================================================ */}
      {featured.length > 0 ? (
        <section
          id="properties"
          style={{
            background: "var(--bg-secondary)",
            padding: "clamp(72px, 8vw, 110px) 0",
          }}
        >
          <div
            style={{ maxWidth: "var(--max-w)", margin: "0 auto", padding: "0 var(--edge-d)" }}
          >
            <SectionTitle copy={featuredCopy} />
            <div
              className="v3-feat-grid"
              style={{
                marginTop: "clamp(40px, 5vw, 64px)",
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "clamp(28px, 3vw, 48px) clamp(24px, 2.4vw, 36px)",
              }}
            >
              {featured.map((card) => (
                <FeaturedCard key={card.id} card={card} locale={locale} />
              ))}
            </div>
            <div style={{ marginTop: "clamp(40px, 5vw, 60px)", textAlign: "center" }}>
              <Link
                href={buildLocalizedPath(locale, "/properties")}
                className="btn btn-primary"
              >
                View all listings <span className="arrow">→</span>
              </Link>
            </div>
          </div>
          <style>{`
            @media (max-width: 860px) { .v3-feat-grid { grid-template-columns: 1fr 1fr !important; } }
            @media (max-width: 560px) { .v3-feat-grid { grid-template-columns: 1fr !important; } }
          `}</style>
        </section>
      ) : null}

      {/* ============================================================
          4 · WELCOME — портрет + био
          ============================================================ */}
      {about ? (
        <section
          id="about"
          style={{ background: "var(--bg-primary)", padding: "clamp(72px, 8vw, 120px) 0" }}
        >
          <div
            style={{ maxWidth: "var(--max-w)", margin: "0 auto", padding: "0 var(--edge-d)" }}
          >
            <div
              className="v3-welcome"
              style={{
                display: "grid",
                gridTemplateColumns: about.portrait_url ? "0.85fr 1.15fr" : "1fr",
                gap: "clamp(40px, 6vw, 90px)",
                alignItems: "center",
              }}
            >
              {about.portrait_url ? (
                <div
                  style={{
                    position: "relative",
                    aspectRatio: "4 / 5",
                    overflow: "hidden",
                    background: "var(--bg-tertiary)",
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
                      filter: "grayscale(0.5) contrast(1.03)",
                    }}
                  />
                </div>
              ) : null}
              <div>
                {about.eyebrow_text ? (
                  <div
                    style={{
                      fontSize: 11,
                      letterSpacing: "0.32em",
                      textTransform: "uppercase",
                      color: "var(--accent)",
                      marginBottom: 18,
                      fontWeight: 500,
                    }}
                  >
                    {about.eyebrow_text}
                  </div>
                ) : null}
                <h2
                  className="serif"
                  style={{
                    fontSize: "clamp(2rem, 3.6vw, 3rem)",
                    letterSpacing: "-0.025em",
                    lineHeight: 1.08,
                    fontWeight: 400,
                    maxWidth: "18ch",
                  }}
                >
                  {about.headline}
                  {about.headline_accent ? (
                    <>
                      {" "}
                      <em style={{ fontStyle: "italic", color: "var(--accent)" }}>
                        {about.headline_accent}
                      </em>
                    </>
                  ) : null}
                  {about.headline_suffix ? <> {about.headline_suffix}</> : null}
                </h2>
                {about.body ? (
                  <p
                    style={{
                      marginTop: 24,
                      fontSize: 16.5,
                      lineHeight: 1.65,
                      color: "var(--text-secondary)",
                      maxWidth: "54ch",
                      textWrap: "pretty",
                    }}
                  >
                    {about.body}
                  </p>
                ) : null}
                {about.body_2 ? (
                  <p
                    style={{
                      marginTop: 18,
                      fontSize: 16.5,
                      lineHeight: 1.65,
                      color: "var(--text-secondary)",
                      maxWidth: "54ch",
                      textWrap: "pretty",
                    }}
                  >
                    {about.body_2}
                  </p>
                ) : null}
                <div style={{ marginTop: 32 }}>
                  <Link
                    href={localize(about.cta_href, locale)}
                    className="btn btn-primary"
                  >
                    {about.cta_label} <span className="arrow">→</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
          <style>{`
            @media (max-width: 860px) { .v3-welcome { grid-template-columns: 1fr !important; gap: 40px !important; } }
          `}</style>
        </section>
      ) : null}

      {/* ============================================================
          5 · WHY — тёмная секция, причины
          ============================================================ */}
      {reasons.length > 0 ? (
        <section
          className="on-dark"
          style={{ background: "#131311", color: "#F5F4EE", padding: "clamp(72px, 8vw, 120px) 0" }}
        >
          <div
            style={{ maxWidth: "var(--max-w)", margin: "0 auto", padding: "0 var(--edge-d)" }}
          >
            <SectionTitle copy={whyCopy} light />
            <div
              className="v3-why"
              style={{
                marginTop: "clamp(44px, 5vw, 72px)",
                display: "grid",
                gridTemplateColumns: `repeat(${Math.min(reasons.length, 4)}, 1fr)`,
                gap: "clamp(28px, 3vw, 44px)",
              }}
            >
              {reasons.map((reason, i) => (
                <div
                  key={reason.id}
                  style={{ borderTop: "1px solid rgba(245,244,238,0.18)", paddingTop: 22 }}
                >
                  <div
                    className="serif tnum"
                    style={{ fontSize: 13, color: "var(--accent)", marginBottom: 18 }}
                  >
                    0{i + 1}
                  </div>
                  <h3
                    className="serif"
                    style={{
                      fontSize: "1.375rem",
                      letterSpacing: "-0.02em",
                      fontWeight: 400,
                      lineHeight: 1.1,
                      color: "#F5F4EE",
                    }}
                  >
                    {reason.title}
                  </h3>
                  {reason.body ? (
                    <p
                      style={{
                        marginTop: 14,
                        fontSize: 14.5,
                        lineHeight: 1.6,
                        color: "rgba(245,244,238,0.66)",
                        textWrap: "pretty",
                      }}
                    >
                      {reason.body}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
          <style>{`
            @media (max-width: 860px) { .v3-why { grid-template-columns: 1fr 1fr !important; } }
            @media (max-width: 480px) { .v3-why { grid-template-columns: 1fr !important; } }
          `}</style>
        </section>
      ) : null}

      {/* ============================================================
          5b · PROCESS — этапы работы (нумерованные карточки)
          ============================================================ */}
      {processSteps.length > 0 ? (
        <section
          style={{ background: "var(--bg-primary)", padding: "clamp(72px, 8vw, 110px) 0" }}
        >
          <div
            style={{ maxWidth: "var(--max-w)", margin: "0 auto", padding: "0 var(--edge-d)" }}
          >
            <SectionTitle copy={processCopy} />
            <div
              className="v3-process"
              style={{
                marginTop: "clamp(44px, 5vw, 72px)",
                display: "grid",
                gridTemplateColumns: `repeat(${Math.min(processSteps.length, 4)}, 1fr)`,
                gap: "clamp(28px, 3vw, 44px)",
              }}
            >
              {processSteps.map((step) => (
                <div
                  key={step.id}
                  style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 22 }}
                >
                  <div
                    className="serif tnum"
                    style={{ fontSize: 13, color: "var(--accent)", marginBottom: 18 }}
                  >
                    {step.step_number}
                  </div>
                  <h3
                    className="serif"
                    style={{
                      fontSize: "1.375rem",
                      letterSpacing: "-0.02em",
                      fontWeight: 400,
                      lineHeight: 1.1,
                      color: "var(--text-primary)",
                    }}
                  >
                    {step.title}
                  </h3>
                  {step.body ? (
                    <p
                      style={{
                        marginTop: 14,
                        fontSize: 14.5,
                        lineHeight: 1.6,
                        color: "var(--text-secondary)",
                        textWrap: "pretty",
                      }}
                    >
                      {step.body}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
          <style>{`
            @media (max-width: 860px) { .v3-process { grid-template-columns: 1fr 1fr !important; } }
            @media (max-width: 480px) { .v3-process { grid-template-columns: 1fr !important; } }
          `}</style>
        </section>
      ) : null}

      {/* ============================================================
          6 · ADVANTAGE — крупные цифры + строка партнёров
          ============================================================ */}
      {stats.length > 0 || trust.length > 0 ? (
        <section
          style={{ background: "var(--bg-secondary)", padding: "clamp(64px, 7vw, 96px) 0" }}
        >
          <div
            style={{ maxWidth: "var(--max-w)", margin: "0 auto", padding: "0 var(--edge-d)" }}
          >
            {stats.length > 0 ? (
              <div
                className="v3-stats"
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${Math.min(stats.length, 4)}, 1fr)`,
                  gap: "clamp(24px, 3vw, 48px)",
                  textAlign: "center",
                }}
              >
                {stats.map((stat) => (
                  <div key={stat.id}>
                    <div
                      className="serif tnum"
                      style={{
                        fontSize: "clamp(2.75rem, 6vw, 4.5rem)",
                        letterSpacing: "-0.035em",
                        lineHeight: 0.95,
                        color: "var(--text-primary)",
                        fontWeight: 400,
                      }}
                    >
                      {stat.value}
                      {stat.suffix ? (
                        <span style={{ color: "var(--accent)" }}>{stat.suffix}</span>
                      ) : null}
                    </div>
                    <div
                      style={{
                        marginTop: 14,
                        fontSize: 12,
                        letterSpacing: "0.16em",
                        textTransform: "uppercase",
                        color: "var(--text-tertiary)",
                      }}
                    >
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {trust.length > 0 ? (
              <div
                className="v3-partners"
                style={{
                  marginTop: stats.length > 0 ? "clamp(44px, 5vw, 64px)" : 0,
                  paddingTop: stats.length > 0 ? "clamp(32px, 4vw, 44px)" : 0,
                  borderTop: stats.length > 0 ? "1px solid var(--border-subtle)" : "none",
                  display: "flex",
                  justifyContent: "center",
                  gap: "clamp(28px, 5vw, 64px)",
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                {trust.map((badge) => (
                  <span
                    key={badge.id}
                    className="serif"
                    style={{
                      fontSize: "clamp(1.125rem, 1.6vw, 1.5rem)",
                      color: "var(--text-tertiary)",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {badge.label}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <style>{`
            @media (max-width: 680px) { .v3-stats { grid-template-columns: 1fr 1fr !important; gap: 36px !important; } }
          `}</style>
        </section>
      ) : null}

      {/* ============================================================
          6b · PRESS — логотипы/имена изданий ("As featured in")
          ============================================================ */}
      {press.length > 0 ? (
        <section
          style={{ background: "var(--bg-primary)", padding: "clamp(48px, 6vw, 72px) 0" }}
        >
          <div
            style={{ maxWidth: "var(--max-w)", margin: "0 auto", padding: "0 var(--edge-d)" }}
          >
            <div
              style={{
                fontSize: 11,
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: "var(--text-tertiary)",
                textAlign: "center",
                marginBottom: "clamp(28px, 3.5vw, 44px)",
              }}
            >
              As featured in
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "clamp(32px, 5vw, 72px)",
                flexWrap: "wrap",
              }}
            >
              {press.map((logo) =>
                logo.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={logo.id}
                    src={logo.logo_url}
                    alt={logo.name}
                    style={{
                      height: "clamp(22px, 2.4vw, 32px)",
                      width: "auto",
                      objectFit: "contain",
                      opacity: 0.6,
                      filter: "grayscale(1)",
                    }}
                  />
                ) : (
                  <span
                    key={logo.id}
                    className="serif"
                    style={{
                      fontSize: "clamp(1.125rem, 1.6vw, 1.5rem)",
                      color: "var(--text-tertiary)",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {logo.name}
                  </span>
                ),
              )}
            </div>
          </div>
        </section>
      ) : null}

      {/* ============================================================
          7 · COMMUNITIES — районы Дубая (2 колонки)
          ============================================================ */}
      {markets.length > 0 ? (
        <section
          id="markets"
          style={{ background: "var(--bg-primary)", padding: "clamp(72px, 8vw, 110px) 0" }}
        >
          <div
            style={{ maxWidth: "var(--max-w)", margin: "0 auto", padding: "0 var(--edge-d)" }}
          >
            <SectionTitle copy={communitiesCopy} />
            <div
              className="v3-comm"
              style={{
                marginTop: "clamp(40px, 5vw, 64px)",
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "clamp(20px, 2.2vw, 32px)",
              }}
            >
              {markets.map((market) => (
                <Link
                  key={market.id}
                  href={
                    market.href
                      ? localize(market.href, locale)
                      : buildLocalizedPath(locale, "/properties")
                  }
                  className="on-dark img-hover v3-comm-card"
                  style={{
                    position: "relative",
                    display: "block",
                    aspectRatio: "16 / 10",
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
                        filter: "brightness(0.66)",
                      }}
                    />
                  ) : null}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "linear-gradient(180deg, rgba(11,11,12,0.1) 0%, rgba(11,11,12,0) 40%, rgba(11,11,12,0.8) 100%)",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      left: "clamp(24px,3vw,40px)",
                      right: "clamp(24px,3vw,40px)",
                      bottom: "clamp(24px,3vw,36px)",
                    }}
                  >
                    <h3
                      className="serif"
                      style={{
                        fontSize: "clamp(1.75rem, 3vw, 2.75rem)",
                        letterSpacing: "-0.03em",
                        lineHeight: 1,
                        color: "#F5F4EE",
                        fontWeight: 400,
                      }}
                    >
                      {market.name}
                    </h3>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr auto",
                        gap: 20,
                        alignItems: "end",
                        marginTop: 14,
                      }}
                    >
                      {market.blurb ? (
                        <p
                          style={{
                            fontSize: 13.5,
                            color: "rgba(245,244,238,0.78)",
                            lineHeight: 1.5,
                            maxWidth: "38ch",
                            margin: 0,
                          }}
                        >
                          {market.blurb}
                        </p>
                      ) : (
                        <span />
                      )}
                      <span
                        style={{
                          fontSize: 11,
                          letterSpacing: "0.16em",
                          textTransform: "uppercase",
                          color: "var(--accent)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Explore →
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
          <style>{`
            @media (max-width: 680px) { .v3-comm { grid-template-columns: 1fr !important; } }
          `}</style>
        </section>
      ) : null}

      {/* ============================================================
          8 · STORIES — отзывы
          ============================================================ */}
      {testimonials.length > 0 ? (
        <section
          style={{ background: "var(--bg-secondary)", padding: "clamp(72px, 8vw, 120px) 0" }}
        >
          <div
            style={{
              maxWidth: "var(--max-w)",
              margin: "0 auto",
              padding: "0 var(--edge-d)",
            }}
          >
            <SectionTitle copy={storiesCopy} />
            <TestimonialsCarousel items={testimonials} />
          </div>
        </section>
      ) : null}

      {/* ============================================================
          8b · CTA — тёмный финальный призыв к действию
          ============================================================ */}
      {cta ? (
        <section
          className="on-dark"
          style={{
            background: "#131311",
            color: "#F5F4EE",
            padding: "clamp(80px, 10vw, 140px) 0",
          }}
        >
          <div
            style={{
              maxWidth: "var(--max-w)",
              margin: "0 auto",
              padding: "0 var(--edge-d)",
              textAlign: "center",
            }}
          >
            {cta.eyebrow_text ? (
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: "0.32em",
                  textTransform: "uppercase",
                  color: "var(--accent)",
                  marginBottom: 22,
                  fontWeight: 500,
                }}
              >
                {cta.eyebrow_text}
              </div>
            ) : null}
            <h2
              className="serif"
              style={{
                fontSize: "clamp(2.25rem, 5vw, 4rem)",
                letterSpacing: "-0.03em",
                lineHeight: 1.02,
                fontWeight: 400,
                color: "#F5F4EE",
                maxWidth: "20ch",
                margin: "0 auto",
                textWrap: "balance",
              }}
            >
              {cta.headline_left}
              {cta.headline_italic ? (
                <>
                  {" "}
                  <em style={{ fontStyle: "italic", color: "var(--accent)" }}>
                    {cta.headline_italic}
                  </em>
                </>
              ) : null}
              {cta.headline_right ? <> {cta.headline_right}</> : null}
            </h2>
            {cta.subtitle ? (
              <p
                style={{
                  marginTop: 24,
                  fontSize: "clamp(1rem, 1.4vw, 1.125rem)",
                  color: "rgba(245,244,238,0.72)",
                  maxWidth: "48ch",
                  margin: "24px auto 0",
                  lineHeight: 1.6,
                }}
              >
                {cta.subtitle}
              </p>
            ) : null}
            <div
              style={{
                marginTop: 40,
                display: "flex",
                gap: 14,
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              {cta.primary_cta_label ? (
                <Link
                  href={localize(cta.primary_cta_href, locale)}
                  className="btn btn-solid"
                >
                  {cta.primary_cta_label} <span className="arrow">→</span>
                </Link>
              ) : null}
              {cta.secondary_cta_label ? (
                <Link
                  href={localize(cta.secondary_cta_href, locale)}
                  className="btn btn-ghost"
                >
                  {cta.secondary_cta_label}
                </Link>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {/* ============================================================
          9 · SUBSCRIBE — тёмный баннер с формой (client)
          ============================================================ */}
      <SubscribeBand
        eyebrow={subscribeCopy.eyebrow}
        lead={subscribeCopy.lead}
        accent={subscribeCopy.accent}
        subtitle={subscribeCopy.subtitle}
        imageUrl={subscribeCopy.imageUrl}
        locale={locale}
      />
    </>
  );
}

// ============================================================
//  Заголовок секции: eyebrow + lead + курсивный accent.
// ============================================================

function SectionTitle({
  copy,
  light,
}: {
  copy: SectionCopy;
  light?: boolean;
}) {
  return (
    <div style={{ textAlign: "center", maxWidth: 720, margin: "0 auto" }}>
      {copy.eyebrow ? (
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "var(--accent)",
            marginBottom: 18,
            fontWeight: 500,
          }}
        >
          {copy.eyebrow}
        </div>
      ) : null}
      <h2
        className="serif"
        style={{
          fontSize: "clamp(2rem, 4.4vw, 3.5rem)",
          letterSpacing: "-0.02em",
          lineHeight: 1.04,
          fontWeight: 400,
          color: light ? "#F5F4EE" : "var(--text-primary)",
        }}
      >
        {copy.lead}{" "}
        {copy.accent ? (
          <em style={{ fontStyle: "italic", color: "var(--accent)" }}>
            {copy.accent}
          </em>
        ) : null}
      </h2>
    </div>
  );
}

// ============================================================
//  Карточка объекта (Featured) — фото 4:3, цена, beds/baths/size.
// ============================================================

function FeaturedCard({
  card,
  locale,
}: {
  card: PublicPropertyCard;
  locale: Locale;
}) {
  const city = card.city || card.area || "Dubai";
  const cycle = priceCycle(card.purpose);
  const specs = [
    card.bedrooms && card.bedrooms > 0 ? `${card.bedrooms} Beds` : null,
    card.bathrooms ? `${card.bathrooms} Baths` : null,
    card.size ? `${card.size} ${card.sizeUnit}` : null,
  ].filter(Boolean) as string[];

  return (
    <Link
      href={buildLocalizedPath(locale, `/properties/${card.slug}`)}
      className="img-hover"
      style={{ display: "flex", flexDirection: "column", color: "inherit" }}
    >
      <div
        style={{
          position: "relative",
          aspectRatio: "4 / 3",
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
        <span
          className="on-dark"
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            fontSize: 10,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#F5F4EE",
            background: "rgba(11,11,12,0.45)",
            backdropFilter: "blur(6px)",
            padding: "6px 12px",
          }}
        >
          {dealBadge(card.purpose)}
        </span>
      </div>
      <div style={{ paddingTop: 20, textAlign: "center" }}>
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "var(--text-tertiary)",
          }}
        >
          {city}
        </div>
        <h3
          className="serif"
          style={{
            fontSize: "1.375rem",
            letterSpacing: "-0.015em",
            lineHeight: 1.15,
            marginTop: 10,
            fontWeight: 400,
            color: "var(--text-primary)",
            textWrap: "pretty",
          }}
        >
          {card.title}
        </h3>
        {card.price ? (
          <div
            className="serif tnum"
            style={{
              marginTop: 12,
              fontSize: "1.375rem",
              color: "var(--accent)",
              letterSpacing: "-0.01em",
            }}
          >
            {formatPrice(card.price.amount, card.price.currency)}
            {cycle ? (
              <span
                style={{
                  fontSize: "0.6em",
                  color: "var(--text-tertiary)",
                  fontStyle: "italic",
                }}
              >
                {" "}
                {cycle}
              </span>
            ) : null}
          </div>
        ) : null}
        {specs.length > 0 ? (
          <div
            style={{
              marginTop: 16,
              paddingTop: 16,
              borderTop: "1px solid var(--border-subtle)",
              display: "flex",
              justifyContent: "center",
              gap: 14,
              fontSize: 12.5,
              color: "var(--text-secondary)",
              letterSpacing: "0.02em",
              flexWrap: "wrap",
            }}
          >
            {specs.map((spec, i) => (
              <span key={spec} style={{ display: "inline-flex", gap: 14 }}>
                {i > 0 ? (
                  <span style={{ color: "var(--border-medium)" }}>·</span>
                ) : null}
                {spec}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </Link>
  );
}
