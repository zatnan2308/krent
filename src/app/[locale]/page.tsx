import type { Metadata } from "next";
import Link from "next/link";

import { buildPageMetadata } from "@/features/cms/metadata";
import { PageRenderer } from "@/features/cms/page-renderer";
import { getHomePage } from "@/features/cms/queries";
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
import { buildCanonicalUrl, buildLocaleAlternates } from "@/lib/seo";
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

  if (site) {
    const home = await getHomePage(
      site.organization.id,
      locale,
      site.organization.default_language,
    );
    if (home) {
      return (
        <article className="container py-16">
          <JsonLd data={siteJsonLd} />
          <h1 className="mb-8 text-3xl font-bold tracking-tight sm:text-4xl">
            {home.translation.title}
          </h1>
          <PageRenderer content={home.content} />
        </article>
      );
    }
  }

  // Fallback-hero, пока организация не создала домашнюю страницу.
  return (
    <section className="container flex flex-col items-center gap-6 py-24 text-center">
      {siteJsonLd.length > 0 ? <JsonLd data={siteJsonLd} /> : null}
      <Badge variant="secondary">{dictionary.home.badge}</Badge>
      <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
        {dictionary.home.title}
      </h1>
      <p className="max-w-xl text-pretty text-muted-foreground">
        {dictionary.home.subtitle}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href={ROUTES.dashboard.root}
          className={buttonVariants({ size: "lg" })}
        >
          {dictionary.common.openDashboard}
        </Link>
        <Link
          href={ROUTES.auth.signIn}
          className={buttonVariants({ size: "lg", variant: "outline" })}
        >
          {dictionary.common.signIn}
        </Link>
      </div>
    </section>
  );
}
