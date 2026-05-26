import type { Metadata } from "next";
import Link from "next/link";

import { buildPageMetadata } from "@/features/cms/metadata";
import { getHomePage } from "@/features/cms/queries";
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

const HERO_IMG =
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=2400&q=85&auto=format&fit=crop";

const MARKETS = [
  {
    name: "Dubai",
    region: "United Arab Emirates",
    count: "Primary market",
    blurb: "Marina, Downtown, Palm Jumeirah, Emirates Hills, Business Bay, DIFC.",
    img: "https://images.unsplash.com/photo-1546412414-e1885259563a?w=1600&q=85&auto=format&fit=crop",
  },
  {
    name: "New York",
    region: "United States",
    count: "7 active",
    blurb: "Tribeca, West Village, Upper East Side, Brooklyn Heights.",
    img: "https://images.unsplash.com/photo-1518391846015-55a9cc003b25?w=1200&q=85&auto=format&fit=crop",
  },
  {
    name: "Toronto",
    region: "Canada",
    count: "5 active",
    blurb: "Yorkville, King West, The Annex, Forest Hill.",
    img: "https://images.unsplash.com/photo-1517090504586-fde19ea6066f?w=1200&q=85&auto=format&fit=crop",
  },
  {
    name: "London",
    region: "United Kingdom",
    count: "4 active",
    blurb: "Mayfair, Knightsbridge, Kensington, Notting Hill.",
    img: "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1200&q=85&auto=format&fit=crop",
  },
];

const PROCESS = [
  {
    n: "01",
    title: "Initial call",
    body: "A 30-minute conversation. What you need, how you want to live, the numbers that matter. No deck, no platform.",
  },
  {
    n: "02",
    title: "Curated shortlist",
    body: "Three to five properties — never more. Each one walked through by me, vetted against your brief. On- and off-market.",
  },
  {
    n: "03",
    title: "Viewings & negotiation",
    body: "In person in Dubai, on video elsewhere. I handle the offer, the back-and-forth, the paperwork in five languages.",
  },
  {
    n: "04",
    title: "Closing & beyond",
    body: "Snagging, handover, Ejari, mortgage broker introductions, interior designers, schools. The work continues after the keys.",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "I had been searching for eight months across three agencies. Alexey closed our purchase in nineteen days at four percent under asking. He was the only person who actually listened.",
    name: "Sergey D.",
    deal: "Penthouse purchase · Dubai Marina",
  },
  {
    quote:
      "We moved a family of five from Toronto to Dubai in six weeks. School placements, golden visa paperwork, the right neighbourhood. None of it would have happened without him.",
    name: "The Whitfield family",
    deal: "Relocation · Emirates Hills",
  },
];

const TRUST = [
  { label: "RERA", sub: "Dubai · #58432" },
  { label: "NAR", sub: "United States" },
  { label: "CREA", sub: "Canada" },
  { label: "PropertyFinder", sub: "Superagent 2024" },
  { label: "Bayut", sub: "Truebroker" },
];

const PRESS = ["Forbes", "The National", "Khaleej Times", "Bloomberg", "Arabian Business"];

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

  const catalog = site
    ? await getPublicProperties(
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
      )
    : { items: [] };

  const propertiesHref = buildLocalizedPath(locale, "/properties");
  const aboutHref = buildLocalizedPath(locale, "/about");
  const contactHref = buildLocalizedPath(locale, "/contact");

  return (
    <>
      {siteJsonLd.length > 0 ? <JsonLd data={siteJsonLd} /> : null}

      {/* HERO */}
      <section
        className="on-dark relative overflow-hidden"
        style={{ minHeight: "92vh" }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${HERO_IMG})`,
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
            <span style={{ color: "var(--ed-accent)" }}>Licensed Realtor</span>
            <span className="dot" />
            Dubai
            <span className="dot" />
            New York
            <span className="dot" />
            Toronto
            <span className="dot" />
            London
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
            Property, found
            <br />
            <em
              style={{
                fontStyle: "italic",
                fontWeight: 300,
                color: "var(--ed-accent)",
              }}
            >
              personally.
            </em>
          </h1>

          <p
            style={{
              maxWidth: "52ch",
              fontSize: 18,
              lineHeight: 1.55,
              color: "var(--ed-text-2)",
              marginBottom: 36,
            }}
          >
            Apartments, villas and investment opportunities — handled by one
            person, not a platform.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link href={propertiesHref} className="ed-btn">
              Browse properties →
            </Link>
            <Link href={contactHref} className="ed-btn ed-btn-ghost">
              Speak with Alexey
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURED */}
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
      <section
        className="border-t px-5 py-20 sm:px-8 sm:py-28"
        style={{ borderColor: "var(--ed-border)" }}
      >
        <div className="mx-auto max-w-[1440px]">
          <div className="mb-12">
            <p className="ed-eyebrow mb-3">
              Markets<span className="dot" />Four cities, one person
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
            <Link
              href={propertiesHref}
              className="group relative block aspect-[16/10] overflow-hidden lg:row-span-2 lg:aspect-auto"
              style={{ background: "var(--ed-bg-2)" }}
            >
              <div
                className="absolute inset-0 transition-transform duration-700 group-hover:scale-105"
                style={{
                  backgroundImage: `url(${MARKETS[0]!.img})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                <p
                  className="ed-eyebrow mb-2"
                  style={{ color: "rgba(245,244,238,0.7)" }}
                >
                  {MARKETS[0]!.count}
                </p>
                <h3
                  className="ed-serif mb-2"
                  style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)", lineHeight: 1 }}
                >
                  {MARKETS[0]!.name}
                </h3>
                <p
                  className="max-w-md text-sm"
                  style={{ color: "rgba(245,244,238,0.78)" }}
                >
                  {MARKETS[0]!.blurb}
                </p>
              </div>
            </Link>

            {MARKETS.slice(1).map((market) => (
              <Link
                key={market.name}
                href={propertiesHref}
                className="group relative block aspect-[16/10] overflow-hidden"
                style={{ background: "var(--ed-bg-2)" }}
              >
                <div
                  className="absolute inset-0 transition-transform duration-700 group-hover:scale-105"
                  style={{
                    backgroundImage: `url(${market.img})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                  <h3
                    className="ed-serif"
                    style={{ fontSize: "1.5rem", lineHeight: 1.1 }}
                  >
                    {market.name}
                  </h3>
                  <p
                    className="text-xs"
                    style={{ color: "rgba(245,244,238,0.7)" }}
                  >
                    {market.region}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ALEXEY */}
      <section
        className="border-t px-5 py-20 sm:px-8 sm:py-28"
        style={{ borderColor: "var(--ed-border)", background: "var(--ed-bg-2)" }}
      >
        <div className="mx-auto grid max-w-[1440px] items-center gap-12 lg:grid-cols-[2fr_3fr]">
          <div className="aspect-[4/5] w-full overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=900&q=85&auto=format&fit=crop"
              alt="Alexey Kachan"
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <p className="ed-eyebrow mb-3">
              Why Alexey<span className="dot" />Eight years on the ground
            </p>
            <h2
              className="ed-serif mb-8"
              style={{
                fontSize: "clamp(2rem, 4vw, 3.25rem)",
                lineHeight: 1.05,
                letterSpacing: "-0.025em",
              }}
            >
              <em style={{ fontStyle: "italic", color: "var(--ed-accent)" }}>
                One realtor.
              </em>{" "}
              Four jurisdictions. Two hundred closed deals.
            </h2>
            <p
              className="mb-8 max-w-xl text-[17px] leading-relaxed"
              style={{ color: "var(--ed-text-2)" }}
            >
              I work with a small number of clients at a time. Every viewing,
              every negotiation, every closing — done by me, not a junior. If
              you want a platform, you have Booking and Airbnb. If you want
              one person who picks up the phone, you have me.
            </p>
            <ul className="grid max-w-md grid-cols-2 gap-x-8 gap-y-6">
              {[
                { n: "8+", l: "years on the market" },
                { n: "200+", l: "closed deals" },
                { n: "5★", l: "average client rating" },
                { n: "1h", l: "typical reply time" },
              ].map((m) => (
                <li key={m.l}>
                  <p
                    className="ed-serif"
                    style={{
                      fontSize: "2.25rem",
                      lineHeight: 1,
                      color: "var(--ed-accent)",
                    }}
                  >
                    {m.n}
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
          </div>
        </div>
      </section>

      {/* PROCESS */}
      <section
        className="border-t px-5 py-20 sm:px-8 sm:py-28"
        style={{ borderColor: "var(--ed-border)" }}
      >
        <div className="mx-auto max-w-[1440px]">
          <div className="mb-12">
            <p className="ed-eyebrow mb-3">
              Process<span className="dot" />Four steps
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
            {PROCESS.map((step) => (
              <li
                key={step.n}
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
                  {step.n}
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
                  <p
                    className="max-w-2xl text-[16px] leading-relaxed"
                    style={{ color: "var(--ed-text-2)" }}
                  >
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* TRUST */}
      <section
        className="border-t px-5 py-16 sm:px-8 sm:py-20"
        style={{ borderColor: "var(--ed-border)", background: "var(--ed-bg-2)" }}
      >
        <div className="mx-auto max-w-[1440px]">
          <p className="ed-eyebrow mb-6">
            Licensed & verified<span className="dot" />Three jurisdictions
          </p>
          <ul className="grid grid-cols-2 gap-6 sm:grid-cols-5">
            {TRUST.map((t) => (
              <li
                key={t.label}
                className="border-l pl-4"
                style={{ borderColor: "var(--ed-accent)" }}
              >
                <p
                  className="ed-serif text-xl"
                  style={{ color: "var(--ed-text)" }}
                >
                  {t.label}
                </p>
                <p className="text-xs" style={{ color: "var(--ed-text-3)" }}>
                  {t.sub}
                </p>
              </li>
            ))}
          </ul>

          <div
            className="mt-10 border-t pt-6"
            style={{ borderColor: "var(--ed-border)" }}
          >
            <p className="ed-eyebrow mb-4">As seen in</p>
            <div
              className="flex flex-wrap items-center gap-x-10 gap-y-3 text-sm"
              style={{ color: "var(--ed-text-3)" }}
            >
              {PRESS.map((p) => (
                <span key={p} className="ed-serif italic">
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section
        className="border-t px-5 py-20 sm:px-8 sm:py-28"
        style={{ borderColor: "var(--ed-border)" }}
      >
        <div className="mx-auto max-w-[1100px]">
          {TESTIMONIALS.map((t, idx) => (
            <figure key={idx} className="mb-16 last:mb-0">
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
              <figcaption
                className="mt-6 text-sm"
                style={{ color: "var(--ed-text-3)" }}
              >
                — <strong style={{ color: "var(--ed-text)" }}>{t.name}</strong>{" "}
                · {t.deal}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section
        className="border-t px-5 py-24 sm:px-8 sm:py-32"
        style={{
          borderColor: "var(--ed-border)",
          background: "var(--ed-bg-2)",
        }}
      >
        <div className="mx-auto max-w-[1000px] text-center">
          <p className="ed-eyebrow mb-4">
            Speak with Alexey<span className="dot" />Available now
          </p>
          <h2
            className="ed-serif mb-8"
            style={{
              fontSize: "clamp(2.5rem, 6vw, 5rem)",
              lineHeight: 0.95,
              letterSpacing: "-0.035em",
            }}
          >
            Tell me what you{" "}
            <em style={{ fontStyle: "italic", color: "var(--ed-accent)" }}>
              actually
            </em>{" "}
            need.
          </h2>
          <p
            className="mx-auto mb-10 max-w-xl text-[17px] leading-relaxed"
            style={{ color: "var(--ed-text-2)" }}
          >
            One message. One reply within the hour. No funnel, no platform.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href={contactHref} className="ed-btn">
              Send a message →
            </Link>
            <Link href={aboutHref} className="ed-btn ed-btn-ghost">
              More about me
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
