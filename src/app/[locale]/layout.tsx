import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { PublicLayout } from "@/components/layout/public-layout";
import { AnalyticsTracker } from "@/features/analytics/tracker";
import { getPublicTrackingConfig } from "@/features/analytics/queries";
import { AttributionTracker } from "@/features/crm/attribution-tracker";
import { DEFAULT_BRANDING } from "@/lib/branding";
import { isLocale } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getCurrentUser } from "@/server/auth";
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
  const [site, user] = await Promise.all([
    getPublicSiteContext(),
    getCurrentUser(),
  ]);
  const siteName = site?.organization.name ?? DEFAULT_BRANDING.appName;
  const logoUrl = site?.brand?.logo_url ?? null;
  const trackingConfig = site
    ? await getPublicTrackingConfig(site.organization.id)
    : null;

  // Имя для приветствия — из user_metadata.full_name либо часть email.
  let userName: string | null = null;
  let userEmail: string | null = null;
  if (user) {
    userEmail = user.email ?? null;
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const meta_name =
      (typeof meta.full_name === "string" && meta.full_name.trim()) ||
      (typeof meta.name === "string" && meta.name.trim()) ||
      "";
    userName = meta_name || (userEmail ? userEmail.split("@")[0]! : null);
  }

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
        supportEmail={null}
        supportPhone={null}
        currentUserName={userName}
        currentUserEmail={userEmail}
      >
        {children}
      </PublicLayout>
    </>
  );
}
