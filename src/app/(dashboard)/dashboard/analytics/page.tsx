import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  getAnalyticsOverview,
  getTrackingSettings,
} from "@/features/analytics/queries";
import { TrackingSettingsForm } from "@/features/analytics/tracking-settings-form";
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
  title: "Analytics",
};

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export default async function AnalyticsPage() {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return null;
  }
  if (!hasPermission(context, "analytics.view")) {
    redirect(ROUTES.dashboard.root);
  }

  const [overview, settings] = await Promise.all([
    getAnalyticsOverview(context.organization.id, 30),
    getTrackingSettings(context.organization.id),
  ]);

  const summary = [
    { label: "Sessions", value: String(overview.sessions) },
    { label: "Page views", value: String(overview.pageViews) },
    { label: "Leads", value: String(overview.leads) },
    { label: "Bookings", value: String(overview.bookings) },
    {
      label: "Lead conversion",
      value: formatPercent(overview.conversionRate),
    },
    {
      label: "Booking conversion",
      value: formatPercent(overview.bookingConversion),
    },
  ];

  const labelsJson = JSON.stringify(
    (settings?.google_ads_labels as Record<string, unknown> | null) ?? {},
    null,
    2,
  );
  const initial = {
    ga4MeasurementId: settings?.ga4_measurement_id ?? "",
    gtmId: settings?.gtm_id ?? "",
    ga4Enabled: settings?.ga4_enabled ?? false,
    metaPixelId: settings?.meta_pixel_id ?? "",
    metaCapiToken: settings?.meta_capi_token ?? "",
    metaPixelEnabled: settings?.meta_pixel_enabled ?? false,
    googleAdsConversionId: settings?.google_ads_conversion_id ?? "",
    googleAdsLabels: labelsJson === "{}" ? "" : labelsJson,
    consentModeEnabled: settings?.consent_mode_enabled ?? false,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description={`Traffic, conversions and tracking integrations for the last ${overview.rangeDays} days.`}
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {summary.map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top properties</CardTitle>
          </CardHeader>
          <CardContent>
            {overview.topProperties.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {overview.topProperties.map((row) => (
                  <li
                    key={row.propertyId}
                    className="flex justify-between gap-3"
                  >
                    <span className="truncate">{row.title}</span>
                    <span className="shrink-0 text-muted-foreground">
                      {row.views} view(s)
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No property views yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Top traffic sources
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overview.topSources.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {overview.topSources.map((row) => (
                  <li
                    key={row.source}
                    className="flex justify-between gap-3"
                  >
                    <span className="truncate">{row.source}</span>
                    <span className="shrink-0 text-muted-foreground">
                      {row.count}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No UTM sessions yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lead sources</CardTitle>
          </CardHeader>
          <CardContent>
            {overview.leadSources.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {overview.leadSources.map((row) => (
                  <li
                    key={row.source}
                    className="flex justify-between gap-3"
                  >
                    <span className="truncate">{row.source}</span>
                    <span className="shrink-0 text-muted-foreground">
                      {row.count} lead(s)
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No leads yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent events</CardTitle>
        </CardHeader>
        <CardContent>
          {overview.recentEvents.length > 0 ? (
            <ul className="divide-y text-sm">
              {overview.recentEvents.map((row, index) => (
                <li
                  key={index}
                  className="flex justify-between gap-3 py-1.5"
                >
                  <span className="font-medium">{row.eventType}</span>
                  <span className="truncate text-muted-foreground">
                    {row.path ?? "—"}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(row.occurredAt).toLocaleTimeString("en-US")}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No events captured yet.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Tracking integrations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TrackingSettingsForm initial={initial} />
        </CardContent>
      </Card>
    </div>
  );
}
