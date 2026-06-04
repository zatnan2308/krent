import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { REAL_ESTATE_AD_WARNINGS } from "@/features/integrations/constants";
import { getAdsOverview } from "@/features/integrations/queries";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ROUTES } from "@/lib/constants/routes";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

export const metadata: Metadata = {
  title: "Google Ads",
};

function money(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

export default async function GoogleAdsDashboard() {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return null;
  }
  if (!hasPermission(context, "analytics.view")) {
    redirect(ROUTES.dashboard.root);
  }

  const overview = await getAdsOverview(
    context.organization.id,
    "google_ads",
    30,
  );

  const summary = [
    {
      label: "Spend",
      value: money(overview.totals.spend, overview.currency),
    },
    {
      label: "Impressions",
      value: overview.totals.impressions.toLocaleString("en-US"),
    },
    {
      label: "Clicks",
      value: overview.totals.clicks.toLocaleString("en-US"),
    },
    { label: "CTR", value: formatPercent(overview.ctr) },
    { label: "CPC", value: money(overview.cpc, overview.currency) },
    {
      label: "Conversions",
      value: overview.totals.conversions.toLocaleString("en-US"),
    },
    { label: "CPA", value: money(overview.cpa, overview.currency) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Integrations", href: ROUTES.dashboard.integrations },
          { label: "Google Ads" },
        ]}
        title="Google Ads"
        description={`Last ${overview.rangeDays} days. Live sync activates once the OAuth flow is wired.`}
      />

      <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        {REAL_ESTATE_AD_WARNINGS.map((line, index) => (
          <p key={index}>{line}</p>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {summary.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border bg-card p-3 shadow-sm"
          >
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="text-lg font-semibold tabular-nums">{stat.value}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          {overview.campaigns.length > 0 ? (
            <ul className="divide-y rounded-md border text-sm">
              {overview.campaigns.map((row) => (
                <li
                  key={row.externalId}
                  className="flex flex-wrap items-center justify-between gap-3 p-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{row.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.clicks} clicks · {row.impressions} impressions
                      · CTR {formatPercent(row.ctr)} · CPC{" "}
                      {money(row.cpc, overview.currency)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-medium">
                    {money(row.spend, overview.currency)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No campaigns synced yet — connect Google Ads and wait for
              the next sync.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Search terms (placeholder)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Search terms report is wired via the Google Ads API once the
            OAuth flow is enabled and the sync job has run.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
