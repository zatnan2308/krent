import type { Metadata } from "next";

import { getSystemHealth } from "@/features/super-admin/queries";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "System health · Super Admin",
};

export const dynamic = "force-dynamic";

export default async function SystemHealthPage() {
  const health = await getSystemHealth();
  const sections: { title: string; rows: { label: string; value: string | number }[] }[] = [
    {
      title: "Organizations",
      rows: [
        { label: "Total", value: health.organizations.total },
        { label: "Active", value: health.organizations.active },
        { label: "Suspended", value: health.organizations.suspended },
      ],
    },
    {
      title: "Users",
      rows: [{ label: "Total", value: health.users.total }],
    },
    {
      title: "Properties",
      rows: [
        { label: "Total", value: health.properties.total },
        { label: "Published", value: health.properties.published },
      ],
    },
    {
      title: "Bookings",
      rows: [
        { label: "Total", value: health.bookings.total },
        { label: "Confirmed", value: health.bookings.confirmed },
      ],
    },
    {
      title: "Webhooks",
      rows: [
        { label: "Pending events", value: health.webhooks.pending },
        { label: "Failed deliveries (24h)", value: health.webhooks.failed24h },
      ],
    },
    {
      title: "Notifications",
      rows: [
        { label: "Pending events", value: health.notifications.pending },
        { label: "Failed deliveries (24h)", value: health.notifications.failed24h },
      ],
    },
    {
      title: "Public API (7 days)",
      rows: [
        { label: "Requests", value: health.apiUsage7d.requests },
        { label: "Errors", value: health.apiUsage7d.errors },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">System health</h1>
        <p className="text-sm text-muted-foreground">
          Platform-wide signals. Use to spot stuck queues, failed integrations
          and global traffic anomalies.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle className="text-base">{section.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {section.rows.map((row) => (
                <p key={row.label} className="flex justify-between">
                  <span className="text-muted-foreground">{row.label}</span>
                  <strong>{row.value}</strong>
                </p>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
