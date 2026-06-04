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
import { buttonVariants } from "@/components/ui/button";
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrations"
        description="Connect Search Console, Google Ads and Meta Ads to power the marketing dashboards."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Connections</CardTitle>
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
                    Open {PROVIDER_LABELS[provider]} dashboard
                  </Link>
                ) : null}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Offline conversions (placeholder)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            CRM events that will be uploaded to Google Ads / Meta Ads as
            offline conversions once the OAuth flow is wired:
          </p>
          <ul className="space-y-2 text-sm">
            {OFFLINE_CONVERSION_TYPES.map((conversion) => (
              <li
                key={conversion.key}
                className="rounded-md border p-3"
              >
                <p className="font-medium">{conversion.label}</p>
                <p className="text-xs text-muted-foreground">
                  {conversion.description}
                </p>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Provider adapters expose an{" "}
            <code>uploadOfflineConversion()</code> method as a clean
            extension point.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
