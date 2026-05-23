import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getGscOverview } from "@/features/integrations/queries";
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
  title: "Search Console",
};

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function formatPosition(value: number): string {
  return value > 0 ? value.toFixed(1) : "—";
}

export default async function SearchConsoleDashboard() {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return null;
  }
  if (!hasPermission(context, "analytics.view")) {
    redirect(ROUTES.dashboard.root);
  }

  const overview = await getGscOverview(context.organization.id, 30);
  const summary = [
    { label: "Clicks", value: overview.totals.clicks.toLocaleString("en-US") },
    {
      label: "Impressions",
      value: overview.totals.impressions.toLocaleString("en-US"),
    },
    { label: "CTR", value: formatPercent(overview.totals.ctr) },
    { label: "Avg position", value: formatPosition(overview.totals.position) },
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
          Search Console
        </h1>
        <p className="text-sm text-muted-foreground">
          Last {overview.rangeDays} days. Live sync and date comparison
          activate once the OAuth flow is wired.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {summary.map((stat) => (
          <div key={stat.label} className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="text-xl font-semibold">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top queries</CardTitle>
          </CardHeader>
          <CardContent>
            {overview.topQueries.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {overview.topQueries.map((row) => (
                  <li
                    key={row.value}
                    className="flex justify-between gap-3"
                  >
                    <span className="truncate">{row.value}</span>
                    <span className="shrink-0 text-muted-foreground">
                      {row.clicks} · pos {formatPosition(row.position)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No query data yet — connect Search Console and sync.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top pages</CardTitle>
          </CardHeader>
          <CardContent>
            {overview.topPages.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {overview.topPages.map((row) => (
                  <li
                    key={row.value}
                    className="flex justify-between gap-3"
                  >
                    <span className="truncate">{row.value}</span>
                    <span className="shrink-0 text-muted-foreground">
                      {row.clicks} · pos {formatPosition(row.position)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No page data yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top countries</CardTitle>
          </CardHeader>
          <CardContent>
            {overview.topCountries.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {overview.topCountries.map((row) => (
                  <li
                    key={row.value}
                    className="flex justify-between gap-3"
                  >
                    <span>{row.value}</span>
                    <span className="text-muted-foreground">
                      {row.clicks} click(s)
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No country data yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top devices</CardTitle>
          </CardHeader>
          <CardContent>
            {overview.topDevices.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {overview.topDevices.map((row) => (
                  <li
                    key={row.value}
                    className="flex justify-between gap-3"
                  >
                    <span>{row.value}</span>
                    <span className="text-muted-foreground">
                      {row.clicks} click(s)
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No device data yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Opportunities (placeholder)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {overview.opportunities.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {overview.opportunities.map((row, index) => (
                <li key={index} className="rounded-md border p-3">
                  <p className="font-medium">{row.type}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.query ?? row.page ?? "—"} ·{" "}
                    {row.impressions.toLocaleString("en-US")} impressions ·
                    pos {formatPosition(row.position ?? 0)}
                  </p>
                  {row.recommendation ? (
                    <p className="mt-1 text-xs">{row.recommendation}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No opportunities recorded yet. The sync job will populate
              high-impression / low-CTR queries here.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
