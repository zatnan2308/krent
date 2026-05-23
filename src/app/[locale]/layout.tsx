import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { PublicLayout } from "@/components/layout/public-layout";
import { AnalyticsTracker } from "@/features/analytics/tracker";
import { getPublicTrackingConfig } from "@/features/analytics/queries";
import { AttributionTracker } from "@/features/crm/attribution-tracker";
import { DEFAULT_BRANDING } from "@/lib/branding";
import { isLocale } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getPublicSiteContext } from "@/server/public-site";

// Публичный сайт зависит от домена (организация-арендатор) — рендер динамический.
export const dynamic = "force-dynamic";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  const locale = params.locale;
  if (!isLocale(locale)) {
    notFound();
  }

  const dictionary = getDictionary(locale);
  const site = await getPublicSiteContext();
  const siteName = site?.organization.name ?? DEFAULT_BRANDING.appName;
  const logoUrl = site?.brand?.logo_url ?? null;
  const trackingConfig = site
    ? await getPublicTrackingConfig(site.organization.id)
    : null;

  return (
    <>
      <AttributionTracker />
      {trackingConfig ? (
        <AnalyticsTracker config={trackingConfig} />
      ) : null}
      <PublicLayout
        locale={locale}
        dictionary={dictionary}
        siteName={siteName}
        logoUrl={logoUrl}
      >
        {children}
      </PublicLayout>
    </>
  );
}
