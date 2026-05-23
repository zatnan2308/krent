import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { REAL_ESTATE_AD_WARNINGS } from "@/features/integrations/constants";
import { getAdsOverview } from "@/features/integrations/queries";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ROUTES } from "@/lib/constants/routes";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

export const metadata: Metadata = {
  title: "Meta Ads",
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

export default async function MetaAdsDashboard() {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return null;
  }
  if (!hasPermission(context, "analytics.view")) {
    redirect(ROUTES.dashboard.root);
  }

  const overview = await getAdsOverview(
    context.organization.id,
    "meta_ads",
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
    { label: "CPM", value: money(overview.cpm, overview.currency) },
    {
      label: "Leads",
      value: overview.totals.leads.toLocaleString("en-US"),
    },
    {
      label: "Cost per lead",
      value: money(overview.costPerLead, overview.currency),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={ROUTES.dashboard.integrations}
          className="text-sm text-muted-foreground hover:underline"
        >
          &larr; Integrations
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Meta Ads
        </h1>
        <p className="text-sm text-muted-foreground">
          Last {overview.rangeDays} days. Live sync activates once the
          OAuth flow is wired.
        </p>
      </div>

      <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        {REAL_ESTATE_AD_WARNINGS.map((line, index) => (
          <p key={index}>{line}</p>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {summary.map((stat) => (
          <div key={stat.label} className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="text-lg font-semibold">{stat.value}</p>
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
                      · CTR {formatPercent(row.ctr)} · {row.leads}{" "}
                      lead(s)
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
              No campaigns synced yet — connect Meta Ads and wait for the
              next sync.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Ad sets &amp; ads (placeholder)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Ad set and ad-level breakdowns sync once the OAuth flow is
            enabled. The schema (
            <code>ad_campaign_reports.level</code>) already supports
            <code> adset</code> and <code>ad</code> rows.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
