import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  LEAD_STATUS_LABELS,
  LEAD_TYPE_LABELS,
} from "@/features/crm/constants";
import { CrmNav } from "@/features/crm/crm-nav";
import { getCrmOverview } from "@/features/crm/queries";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ROUTES } from "@/lib/constants/routes";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

export const metadata: Metadata = {
  title: "CRM",
};

export default async function CrmDashboardPage() {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return null;
  }
  if (!hasPermission(context, "crm.view")) {
    redirect(ROUTES.dashboard.root);
  }

  const overview = await getCrmOverview(context.organization.id);
  const stats = [
    { label: "New leads", value: overview.newLeads },
    { label: "Total leads", value: overview.totalLeads },
    { label: "Open deals", value: overview.openDeals },
    { label: "Open tasks", value: overview.openTasks },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">CRM</h1>
        <p className="text-sm text-muted-foreground">
          Leads, contacts and deals of {context.organization.name}.
        </p>
      </div>
      <CrmNav />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent leads</CardTitle>
        </CardHeader>
        <CardContent>
          {overview.recentLeads.length > 0 ? (
            <ul className="divide-y">
              {overview.recentLeads.map((lead) => (
                <li
                  key={lead.id}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <div className="min-w-0">
                    <Link
                      href={`${ROUTES.dashboard.crmLeads}/${lead.id}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {lead.contactName}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {LEAD_TYPE_LABELS[lead.type]}
                      {lead.propertyTitle ? ` · ${lead.propertyTitle}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {LEAD_STATUS_LABELS[lead.status]}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="No leads yet"
              description="Leads from your website forms will appear here."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
