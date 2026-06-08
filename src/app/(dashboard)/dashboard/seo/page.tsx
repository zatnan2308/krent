import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  getSeoAudit,
  type DuplicateEntry,
  type SeoAuditEntry,
} from "@/features/seo/queries";
import { SeoSettingsForm } from "@/features/seo/seo-settings-form";
import { createAdminClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { getServerDictionary } from "@/lib/i18n/runtime";
import { ROUTES } from "@/lib/constants/routes";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

export const metadata: Metadata = {
  title: "SEO",
};

/** Список найденных проблем аудита либо сообщение «всё хорошо». */
function AuditList({
  items,
  emptyText,
}: {
  items: SeoAuditEntry[];
  emptyText: string;
}) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-emerald-700">{emptyText}</p>
    );
  }
  return (
    <ul className="space-y-1 text-sm">
      {items.map((item, index) => (
        <li key={index} className="text-muted-foreground">
          {item.label}
        </li>
      ))}
    </ul>
  );
}

/** Список повторяющихся значений. */
function DuplicateList({
  items,
  emptyText,
}: {
  items: DuplicateEntry[];
  emptyText: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-emerald-700">{emptyText}</p>;
  }
  return (
    <ul className="space-y-1 text-sm">
      {items.map((item, index) => (
        <li
          key={index}
          className="flex justify-between gap-3 text-muted-foreground"
        >
          <span className="truncate">{item.value}</span>
          <span className="shrink-0">&times;{item.count}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function SeoPage() {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return null;
  }
  if (!hasPermission(context, "seo.manage")) {
    redirect(ROUTES.dashboard.root);
  }

  const audit = await getSeoAudit(context.organization.id);

  const admin = createAdminClient();
  const { data: seo } = await admin
    .from("seo_settings")
    .select("*")
    .eq("organization_id", context.organization.id)
    .maybeSingle();
  const seoInitial = {
    defaultTitle: seo?.default_title ?? "",
    titleSuffix: seo?.title_suffix ?? "",
    defaultDescription: seo?.default_description ?? "",
    defaultOgImageUrl: seo?.default_og_image_url ?? "",
    robotsTxt: seo?.robots_txt ?? "",
    googleSiteVerification: seo?.google_site_verification ?? "",
  };

  // Хост для SEO-превью: основной/верифицированный домен организации.
  const { data: domains } = await admin
    .from("domains")
    .select("domain, status, type")
    .eq("organization_id", context.organization.id);
  const primaryDomain =
    domains?.find((d) => d.type === "primary") ??
    domains?.find((d) => d.status === "verified") ??
    domains?.[0];
  const siteHost = primaryDomain?.domain;
  const dict = await getServerDictionary();
  const t = dict.dashSeo;

  const summary = [
    { label: t.publishedPages, value: audit.publishedPages },
    { label: t.activeProperties, value: audit.activeProperties },
    { label: t.pagesMissingTitle, value: audit.pagesMissingTitle.length },
    {
      label: t.propertiesMissingAlt,
      value: audit.propertiesMissingAlt.length,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={dict.adminNav.seo}
        description={t.description}
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {summary.map((item) => (
          <StatCard key={item.label} label={item.label} value={item.value} />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.siteDefaults}</CardTitle>
        </CardHeader>
        <CardContent>
          <SeoSettingsForm initial={seoInitial} siteHost={siteHost} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.pagesMissingTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <AuditList
              items={audit.pagesMissingTitle}
              emptyText={t.everyPageTitle}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t.pagesMissingDescription}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AuditList
              items={audit.pagesMissingDescription}
              emptyText={t.everyPageDesc}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t.propertiesMissingAltText}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AuditList
              items={audit.propertiesMissingAlt}
              emptyText={t.everyImageAlt}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.noindexPages}</CardTitle>
          </CardHeader>
          <CardContent>
            <AuditList
              items={audit.noindexPages}
              emptyText={t.noDraftPages}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.duplicateTitles}</CardTitle>
          </CardHeader>
          <CardContent>
            <DuplicateList
              items={audit.duplicateTitles}
              emptyText={t.noDuplicates}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t.duplicateDescriptions}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DuplicateList
              items={audit.duplicateDescriptions}
              emptyText={t.noDuplicates}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.sitemap}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p>
            {t.sitemapLine} <code>/sitemap.xml</code> · {t.imageSitemapLine}{" "}
            <code>/api/image-sitemap</code> · {t.robotsLine}{" "}
            <code>/robots.txt</code>
          </p>
          <p>{t.sitemapNote}</p>
        </CardContent>
      </Card>
    </div>
  );
}
