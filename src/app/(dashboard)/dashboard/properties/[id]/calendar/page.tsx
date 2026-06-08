import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { getPropertyForEdit } from "@/features/properties/dashboard-queries";
import { CalendarBoard } from "@/features/rental-calendar/calendar-board";
import { RegenerateExportButton } from "@/features/rental-calendar/export-feed-actions";
import { ImportManager } from "@/features/rental-calendar/import-manager";
import {
  getCalendarData,
  getOrCreateCalendar,
} from "@/features/rental-calendar/queries";
import { RulesForm } from "@/features/rental-calendar/rules-form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ROUTES } from "@/lib/constants/routes";
import { requireOrganizationContext } from "@/server/organization-context";

export const metadata: Metadata = {
  title: "Rental calendar",
};

export default async function PropertyCalendarPage({
  params,
}: {
  params: { id: string };
}) {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return null;
  }

  const property = await getPropertyForEdit(
    context.organization.id,
    params.id,
    context.organization.default_language,
  );
  if (!property) {
    notFound();
  }

  const calendar = await getOrCreateCalendar(
    params.id,
    context.organization.id,
  );
  if (!calendar) {
    notFound();
  }
  const data = await getCalendarData(calendar.id);

  const host = headers().get("host") ?? "";
  const protocol =
    host.startsWith("localhost") || host.startsWith("127.")
      ? "http"
      : "https";
  const exportUrl = data.exportToken
    ? `${protocol}://${host}/api/calendar/properties/${params.id}.ics?token=${data.exportToken}`
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Properties", href: ROUTES.dashboard.properties },
          {
            label: property.property.title,
            href: `${ROUTES.dashboard.properties}/${params.id}`,
          },
          { label: "Rental calendar" },
        ]}
        title="Rental calendar"
        description={property.property.title}
      />

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Availability calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <CalendarBoard propertyId={params.id} events={data.events} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Availability &amp; pricing rules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RulesForm
              propertyId={params.id}
              availabilityRule={data.availabilityRule}
              priceRules={data.priceRules}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">iCal synchronization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {exportUrl ? (
            <div className="rounded-md border p-3">
              <p className="text-sm font-medium">Export feed</p>
              <p className="mt-1 break-all text-xs text-muted-foreground">
                {exportUrl}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Add this URL in Airbnb / Booking.com to share availability.
              </p>
              <RegenerateExportButton propertyId={params.id} />
            </div>
          ) : null}
          <ImportManager
            propertyId={params.id}
            importSources={data.importSources}
            syncLogs={data.syncLogs}
          />
        </CardContent>
      </Card>
    </div>
  );
}
