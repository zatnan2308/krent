import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LeadForm } from "@/features/crm/lead-form";
import { ROUTES } from "@/lib/constants/routes";
import { isLocale, type Locale } from "@/lib/i18n";
import { buildLocaleAlternates } from "@/lib/seo";
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
  const site = await getPublicSiteContext();
  return {
    title: site
      ? `Sell your property — ${site.organization.name}`
      : "Sell your property",
    description: "Request a free, no-obligation valuation of your property.",
    alternates: buildLocaleAlternates(locale, ROUTES.public.sell),
  };
}

export default async function SellPage({
  params,
}: {
  params: { locale: string };
}) {
  const locale = resolveLocale(params.locale);
  const site = await getPublicSiteContext();
  if (!site) {
    notFound();
  }

  return (
    <section className="container max-w-2xl space-y-6 py-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Sell your property
        </h1>
        <p className="mt-2 text-muted-foreground">
          Request a free, no-obligation valuation. Our agents will review the
          details and get back to you with an estimate.
        </p>
      </div>
      <div className="rounded-lg border p-6">
        <LeadForm kind="valuation" locale={locale} />
      </div>
    </section>
  );
}
