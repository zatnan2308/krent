import type { Metadata } from "next";
import Link from "next/link";

import { buildPageMetadata } from "@/features/cms/metadata";
import { PageRenderer } from "@/features/cms/page-renderer";
import { getHomePage } from "@/features/cms/queries";
import { getPublicProperties } from "@/features/properties/queries";
import { PropertyCard } from "@/features/properties/property-card";
import { JsonLd } from "@/features/seo/json-ld";
import {
  organizationJsonLd,
  realEstateAgentJsonLd,
} from "@/features/seo/jsonld";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants/routes";
import { isLocale, type Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { buildCanonicalUrl, buildLocaleAlternates, buildLocalizedPath } from "@/lib/seo";
import { getPublicSiteContext } from "@/server/public-site";

export const dynamic = "force-dynamic";

function resolveLocale(value: string): Locale {
  return isLocale(value) ? value : "en";
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
    if (home) {
      return buildPageMetadata(home, site, locale, "/");
    }
  }

  return {
    title: dictionary.home.title,
    alternates: buildLocaleAlternates(locale, "/"),
  };
}

export default async function LocaleHomePage({
  params,
}: {
  params: { locale: string };
}) {
  const locale = resolveLocale(params.locale);
  const dictionary = getDictionary(locale);
  const site = await getPublicSiteContext();

  // JSON-LD сайта организации: Organization + RealEstateAgent.
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

  // CMS home (если есть) идёт первым блоком, остальные секции — после.
  const home = site
    ? await getHomePage(
        site.organization.id,
        locale,
        site.organization.default_language,
      )
    : null;

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
          pageSize: 6,
        },
      )
    : { items: [] };

  const propertiesHref = buildLocalizedPath(locale, "/properties");
  const aboutHref = buildLocalizedPath(locale, "/about");
  const contactHref = buildLocalizedPath(locale, "/contact");

  return (
    <>
      {siteJsonLd.length > 0 ? <JsonLd data={siteJsonLd} /> : null}

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <div className="container flex flex-col items-center gap-6 py-20 text-center sm:py-24">
          <Badge variant="secondary">{dictionary.home.badge}</Badge>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            {site?.organization.name ?? dictionary.home.title}
          </h1>
          <p className="max-w-2xl text-pretty text-muted-foreground">
            {site?.seo?.default_description ?? dictionary.home.subtitle}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href={propertiesHref}
              className={buttonVariants({ size: "lg" })}
            >
              Browse properties
            </Link>
            <Link
              href={contactHref}
              className={buttonVariants({ size: "lg", variant: "outline" })}
            >
              Contact me
            </Link>
          </div>
        </div>
      </section>

      {/* CMS home content if any */}
      {home ? (
        <section className="container py-12">
          <h2 className="mb-6 text-2xl font-semibold tracking-tight">
            {home.translation.title}
          </h2>
          <PageRenderer content={home.content} />
        </section>
      ) : null}

      {/* Featured properties */}
      {catalog.items.length > 0 ? (
        <section className="container py-12">
          <div className="mb-6 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                Featured properties
              </h2>
              <p className="text-sm text-muted-foreground">
                Hand-picked listings updated weekly.
              </p>
            </div>
            <Link
              href={propertiesHref}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              View all
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {catalog.items.slice(0, 6).map((card) => (
              <PropertyCard key={card.id} card={card} locale={locale} />
            ))}
          </div>
        </section>
      ) : null}

      {/* About */}
      <section className="bg-muted/20">
        <div className="container grid items-center gap-8 py-16 lg:grid-cols-2">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              About
            </p>
            <h2 className="text-2xl font-semibold tracking-tight">
              Personal service for every deal
            </h2>
            <p className="text-muted-foreground">
              Each property is shown personally. Direct booking, transparent
              pricing, fast replies in chat and email.
            </p>
            <div className="pt-2">
              <Link
                href={aboutHref}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                More about me
              </Link>
            </div>
          </div>
          <ul className="grid grid-cols-2 gap-4 text-sm">
            <li className="rounded-lg border bg-background p-4">
              <p className="text-2xl font-semibold">8+</p>
              <p className="text-muted-foreground">years on the market</p>
            </li>
            <li className="rounded-lg border bg-background p-4">
              <p className="text-2xl font-semibold">200+</p>
              <p className="text-muted-foreground">closed deals</p>
            </li>
            <li className="rounded-lg border bg-background p-4">
              <p className="text-2xl font-semibold">5★</p>
              <p className="text-muted-foreground">average client rating</p>
            </li>
            <li className="rounded-lg border bg-background p-4">
              <p className="text-2xl font-semibold">1h</p>
              <p className="text-muted-foreground">typical reply time</p>
            </li>
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-16 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">
          Looking for something specific?
        </h2>
        <p className="mt-2 text-muted-foreground">
          Tell me what you need — I will reply within an hour.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <Link href={contactHref} className={buttonVariants({ size: "lg" })}>
            Get in touch
          </Link>
          <Link
            href={ROUTES.auth.signIn}
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            {dictionary.common.openDashboard}
          </Link>
        </div>
      </section>
    </>
  );
}
