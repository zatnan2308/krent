import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ConnectionCard } from "@/features/integrations/connection-card";
import {
  OFFLINE_CONVERSION_TYPES,
  PROVIDER_LABELS,
} from "@/features/integrations/constants";
import { listIntegrations } from "@/features/integrations/queries";
import type { IntegrationProvider } from "@/features/integrations/types";
import { MessagingChannelsCard } from "@/features/messaging/messaging-channels-card";
import { getChannelConnections } from "@/features/messaging/queries";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ROUTES } from "@/lib/constants/routes";
import { getServerDictionary } from "@/lib/i18n/runtime";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

export const metadata: Metadata = {
  title: "Integrations",
};

const PROVIDERS: IntegrationProvider[] = ["gsc", "google_ads", "meta_ads"];

const DASHBOARD_LINKS: Record<IntegrationProvider, string> = {
  gsc: `${ROUTES.dashboard.integrations}/search-console`,
  google_ads: `${ROUTES.dashboard.integrations}/google-ads`,
  meta_ads: `${ROUTES.dashboard.integrations}/meta-ads`,
};

export default async function IntegrationsPage() {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return null;
  }
  if (!hasPermission(context, "analytics.view")) {
    redirect(ROUTES.dashboard.root);
  }

  const connections = await listIntegrations(context.organization.id);
  const byProvider = new Map(
    connections.map((connection) => [connection.provider, connection]),
  );
  const channelConnections = await getChannelConnections(
    context.organization.id,
  );
  const dict = await getServerDictionary();
  const t = dict.dashIntegrations;
  const offLabel = (key: string): string =>
    (
      ({
        lead_qualified: t.offLeadQualified,
        appointment_booked: t.offAppointment,
        booking_confirmed: t.offBookingConfirmed,
        deal_closed: t.offDealClosed,
      }) as Record<string, string>
    )[key] ?? key;
  const offDesc = (key: string): string =>
    (
      ({
        lead_qualified: t.offLeadQualifiedDesc,
        appointment_booked: t.offAppointmentDesc,
        booking_confirmed: t.offBookingConfirmedDesc,
        deal_closed: t.offDealClosedDesc,
      }) as Record<string, string>
    )[key] ?? "";

  return (
    <div className="space-y-6">
      <PageHeader
        title={dict.adminNav.integrations}
        description={t.description}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.connections}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {PROVIDERS.map((provider) => {
            const connection = byProvider.get(provider) ?? null;
            return (
              <div key={provider} className="space-y-3">
                <ConnectionCard
                  provider={provider}
                  connection={connection}
                />
                {connection && connection.status === "connected" ? (
                  <Link
                    href={DASHBOARD_LINKS[provider]}
                    className={buttonVariants({
                      variant: "outline",
                      size: "sm",
                    })}
                  >
                    {t.openProviderDashboard.replace(
                      "{provider}",
                      PROVIDER_LABELS[provider],
                    )}
                  </Link>
                ) : null}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.messagingChannels}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{t.messagingBlurb}</p>
          <MessagingChannelsCard connections={channelConnections} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.offlineConversions}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{t.offlineBlurb}</p>
          <ul className="space-y-2 text-sm">
            {OFFLINE_CONVERSION_TYPES.map((conversion) => (
              <li
                key={conversion.key}
                className="rounded-md border p-3"
              >
                <p className="font-medium">{offLabel(conversion.key)}</p>
                <p className="text-xs text-muted-foreground">
                  {offDesc(conversion.key)}
                </p>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">{t.adapterNote}</p>
        </CardContent>
      </Card>
    </div>
  );
}
