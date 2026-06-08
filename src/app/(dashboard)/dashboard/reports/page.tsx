import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { BarChart } from "@/components/charts/bar-chart";
import { FunnelChart } from "@/components/charts/funnel-chart";
import {
  getAgentReport,
  getCampaignReport,
  getFunnelReport,
  getPropertyReport,
  getRentalReport,
  getSourceReport,
} from "@/features/reports/queries";
import { getMessagingStats } from "@/features/messaging/queries";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/ui/page-header";
import { ROUTES } from "@/lib/constants/routes";
import { getServerDictionary } from "@/lib/i18n/runtime";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";
import { resolveUserNames } from "@/server/user-directory";

export const metadata: Metadata = {
  title: "Reports",
};

export const dynamic = "force-dynamic";

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function money(value: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${value.toFixed(0)} ${currency}`;
  }
}

export default async function ReportsPage() {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return null;
  }
  if (!hasPermission(context, "analytics.view")) {
    redirect(ROUTES.dashboard.root);
  }
  const orgId = context.organization.id;
  const currency = context.organization.default_currency;

  const [funnel, sources, properties, agents, campaigns, rental, messaging] =
    await Promise.all([
      getFunnelReport(orgId, 30),
      getSourceReport(orgId, 30),
      getPropertyReport(orgId, 30),
      getAgentReport(orgId, 30),
      getCampaignReport(orgId, 60),
      getRentalReport(orgId, 30),
      getMessagingStats(orgId),
    ]);
  const messagingTotal = messaging.reduce(
    (sum, row) => sum + row.conversations,
    0,
  );

  const agentNames = await resolveUserNames(agents.map((row) => row.agentId));
  const dict = await getServerDictionary();
  const t = dict.dashReports;

  return (
    <div className="space-y-6">
      <PageHeader
        title={dict.adminNav.reports}
        description={t.description}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.funnel}</CardTitle>
        </CardHeader>
        <CardContent>
          <FunnelChart data={funnel} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.messagingChannels}</CardTitle>
        </CardHeader>
        <CardContent>
          {messagingTotal === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t.noChannelConvos}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.channel}</TableHead>
                  <TableHead>{t.conversations}</TableHead>
                  <TableHead>{t.received}</TableHead>
                  <TableHead>{t.sent}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {messaging.map((row) => (
                  <TableRow key={row.channel}>
                    <TableCell className="font-medium">{row.label}</TableCell>
                    <TableCell>{row.conversations}</TableCell>
                    <TableCell>{row.received}</TableCell>
                    <TableCell>{row.sent}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.sources}</CardTitle>
        </CardHeader>
        <CardContent>
          {sources.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.noData}</p>
          ) : (
            <>
              <BarChart
                ariaLabel={t.leadsBySource}
                data={sources.map((row) => ({
                  label: row.source,
                  value: row.leads,
                }))}
              />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.source}</TableHead>
                  <TableHead>{t.leads}</TableHead>
                  <TableHead>{t.bookings}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sources.map((row) => (
                  <TableRow key={row.source}>
                    <TableCell>{row.source}</TableCell>
                    <TableCell>{row.leads}</TableCell>
                    <TableCell>{row.bookings}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.properties}</CardTitle>
        </CardHeader>
        <CardContent>
          {properties.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.noData}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.property}</TableHead>
                  <TableHead>{t.views}</TableHead>
                  <TableHead>{t.leads}</TableHead>
                  <TableHead>{t.bookingRequests}</TableHead>
                  <TableHead>{t.convRate}</TableHead>
                  <TableHead>{t.revenue}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {properties.slice(0, 25).map((row) => (
                  <TableRow key={row.propertyId}>
                    <TableCell className="font-medium">{row.title}</TableCell>
                    <TableCell>{row.views}</TableCell>
                    <TableCell>{row.leads}</TableCell>
                    <TableCell>{row.bookingRequests}</TableCell>
                    <TableCell>{pct(row.conversionRate)}</TableCell>
                    <TableCell>{money(row.revenue, currency)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.agents}</CardTitle>
        </CardHeader>
        <CardContent>
          {agents.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.noData}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.agent}</TableHead>
                  <TableHead>{t.assignedLeads}</TableHead>
                  <TableHead>{t.contacted}</TableHead>
                  <TableHead>{t.appointments}</TableHead>
                  <TableHead>{t.dealsWon}</TableHead>
                  <TableHead>{t.bookings}</TableHead>
                  <TableHead>{t.revenue}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((row) => (
                  <TableRow key={row.agentId}>
                    <TableCell className="font-medium">
                      {agentNames.get(row.agentId) ?? row.agentId.slice(0, 8)}
                    </TableCell>
                    <TableCell>{row.assignedLeads}</TableCell>
                    <TableCell>{row.contactedLeads}</TableCell>
                    <TableCell>{row.appointments}</TableCell>
                    <TableCell>{row.deals}</TableCell>
                    <TableCell>{row.bookings}</TableCell>
                    <TableCell>{money(row.revenue, currency)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.emailCampaigns}</CardTitle>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.noCampaigns}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.campaign}</TableHead>
                  <TableHead>{t.sent}</TableHead>
                  <TableHead>{t.delivered}</TableHead>
                  <TableHead>{t.opened}</TableHead>
                  <TableHead>{t.clicked}</TableHead>
                  <TableHead>{t.unsubscribed}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((row) => (
                  <TableRow key={row.campaignId}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell>{row.sent}</TableCell>
                    <TableCell>{row.delivered}</TableCell>
                    <TableCell>{row.opened}</TableCell>
                    <TableCell>{row.clicked}</TableCell>
                    <TableCell>{row.unsubscribed}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.rentalKpis}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">{t.bookedNights}</p>
            <p className="text-lg font-semibold">{rental.bookedNights}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t.blockedNights}</p>
            <p className="text-lg font-semibold">{rental.blockedNights}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t.totalInventory}</p>
            <p className="text-lg font-semibold">{rental.totalNights}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t.occupancy}</p>
            <p className="text-lg font-semibold">{pct(rental.occupancy)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t.revenue}</p>
            <p className="text-lg font-semibold">
              {money(rental.revenue, currency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t.adr}</p>
            <p className="text-lg font-semibold">
              {money(rental.adr, currency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t.directBookingShare}</p>
            <p className="text-lg font-semibold">{pct(rental.directBookingShare)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
