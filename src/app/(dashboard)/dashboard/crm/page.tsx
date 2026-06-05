import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ListTodo, TrendingUp, UserCheck, Users } from "lucide-react";

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
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { ROUTES } from "@/lib/constants/routes";
import { getServerDictionary } from "@/lib/i18n/runtime";
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
  const dict = await getServerDictionary();
  const t = dict.dashCrm;
  const stats = [
    {
      label: t.newLeads,
      value: overview.newLeads,
      icon: UserCheck,
      href: ROUTES.dashboard.crmLeads,
    },
    {
      label: t.totalLeads,
      value: overview.totalLeads,
      icon: Users,
      href: ROUTES.dashboard.crmLeads,
    },
    {
      label: t.openDeals,
      value: overview.openDeals,
      icon: TrendingUp,
      href: ROUTES.dashboard.crmDeals,
    },
    {
      label: t.openTasks,
      value: overview.openTasks,
      icon: ListTodo,
      href: ROUTES.dashboard.crmTasks,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={dict.adminNav.crm}
        description={t.description.replace("{name}", context.organization.name)}
      />
      <CrmNav />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            icon={stat.icon}
            href={stat.href}
          />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.recentLeads}</CardTitle>
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
            <EmptyState title={t.emptyTitle} description={t.emptyDesc} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
