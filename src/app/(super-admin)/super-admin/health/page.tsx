import type { Metadata } from "next";

import { getSystemHealth } from "@/features/super-admin/queries";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getServerDictionary } from "@/lib/i18n/runtime";

export const metadata: Metadata = {
  title: "System health · Super Admin",
};

export const dynamic = "force-dynamic";

export default async function SystemHealthPage() {
  const health = await getSystemHealth();
  const dict = await getServerDictionary();
  const t = dict.superAdmin;
  const sections: {
    id: string;
    title: string;
    rows: { id: string; label: string; value: string | number }[];
  }[] = [
    {
      id: "organizations",
      title: t.organizations,
      rows: [
        { id: "total", label: t.rowTotal, value: health.organizations.total },
        { id: "active", label: t.rowActive, value: health.organizations.active },
        { id: "suspended", label: t.suspended, value: health.organizations.suspended },
      ],
    },
    {
      id: "users",
      title: dict.adminNav.users,
      rows: [{ id: "total", label: t.rowTotal, value: health.users.total }],
    },
    {
      id: "properties",
      title: t.properties,
      rows: [
        { id: "total", label: t.rowTotal, value: health.properties.total },
        { id: "published", label: t.rowPublished, value: health.properties.published },
      ],
    },
    {
      id: "bookings",
      title: t.secBookings,
      rows: [
        { id: "total", label: t.rowTotal, value: health.bookings.total },
        { id: "confirmed", label: t.rowConfirmed, value: health.bookings.confirmed },
      ],
    },
    {
      id: "webhooks",
      title: t.secWebhooks,
      rows: [
        { id: "pending", label: t.rowPendingEvents, value: health.webhooks.pending },
        { id: "failed", label: t.rowFailed24h, value: health.webhooks.failed24h },
      ],
    },
    {
      id: "notifications",
      title: t.secNotifications,
      rows: [
        { id: "pending", label: t.rowPendingEvents, value: health.notifications.pending },
        { id: "failed", label: t.rowFailed24h, value: health.notifications.failed24h },
      ],
    },
    {
      id: "api",
      title: t.secPublicApi,
      rows: [
        { id: "requests", label: t.rowRequests, value: health.apiUsage7d.requests },
        { id: "errors", label: t.rowErrors, value: health.apiUsage7d.errors },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={dict.adminNav.systemHealth}
        description={t.healthDesc}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <Card key={section.id}>
            <CardHeader>
              <CardTitle className="text-base">{section.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {section.rows.map((row) => (
                <p key={row.id} className="flex justify-between">
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
