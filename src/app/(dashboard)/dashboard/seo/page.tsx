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
function DuplicateList({ items }: { items: DuplicateEntry[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-emerald-700">No duplicates found.</p>
    );
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

  const summary = [
    { label: "Published pages", value: audit.publishedPages },
    { label: "Active properties", value: audit.activeProperties },
    { label: "Pages missing title", value: audit.pagesMissingTitle.length },
    {
      label: "Properties missing alt",
      value: audit.propertiesMissingAlt.length,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="SEO"
        description="Audit of titles, descriptions, image alt text and indexing across your pages and properties."
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {summary.map((item) => (
          <StatCard key={item.label} label={item.label} value={item.value} />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Site SEO defaults</CardTitle>
        </CardHeader>
        <CardContent>
          <SeoSettingsForm initial={seoInitial} siteHost={siteHost} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pages missing title</CardTitle>
          </CardHeader>
          <CardContent>
            <AuditList
              items={audit.pagesMissingTitle}
              emptyText="Every published page has an SEO title."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Pages missing description
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AuditList
              items={audit.pagesMissingDescription}
              emptyText="Every published page has an SEO description."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Properties missing alt text
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AuditList
              items={audit.propertiesMissingAlt}
              emptyText="Every property image has alt text."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Noindex pages</CardTitle>
          </CardHeader>
          <CardContent>
            <AuditList
              items={audit.noindexPages}
              emptyText="No draft (non-indexable) pages."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Duplicate titles</CardTitle>
          </CardHeader>
          <CardContent>
            <DuplicateList items={audit.duplicateTitles} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Duplicate descriptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DuplicateList items={audit.duplicateDescriptions} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sitemap</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p>
            Sitemap: <code>/sitemap.xml</code> · Image sitemap:{" "}
            <code>/api/image-sitemap</code> · Robots:{" "}
            <code>/robots.txt</code>
          </p>
          <p>
            Sitemaps regenerate on each request. Submission status tracking
            is a placeholder for a future Search Console integration.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
