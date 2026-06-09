import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CrmNav } from "@/features/crm/crm-nav";
import { listUpcomingFollowUps, type FollowUpItem } from "@/features/crm/queries";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { ROUTES } from "@/lib/constants/routes";
import { getServerDictionary } from "@/lib/i18n/runtime";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

export const metadata: Metadata = {
  title: "Follow-ups",
};

export const dynamic = "force-dynamic";

export default async function CrmFollowUpsPage() {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return null;
  }
  if (!hasPermission(context, "crm.view")) {
    redirect(ROUTES.dashboard.root);
  }

  const items = await listUpcomingFollowUps(context.organization.id);
  const now = Date.now();
  const overdue = items.filter(
    (item) => new Date(item.nextFollowUpAt).getTime() < now,
  );
  const upcoming = items.filter(
    (item) => new Date(item.nextFollowUpAt).getTime() >= now,
  );
  const dict = await getServerDictionary();
  const t = dict.dashCrm;

  const roleLabels: Record<string, string> = {
    buyer: t.roleBuyer,
    seller: t.roleSeller,
    renter: t.roleRenter,
    landlord: t.roleLandlord,
    investor: t.roleInvestor,
    other: t.roleOther,
  };

  const renderList = (rows: FollowUpItem[], overdueRows: boolean) => (
    <ul className="divide-y">
      {rows.map((item) => (
        <li
          key={item.id}
          className="flex items-center justify-between gap-3 py-2"
        >
          <div className="min-w-0">
            <Link
              href={`${ROUTES.dashboard.crmContacts}/${item.id}`}
              className="text-sm font-medium hover:underline"
            >
              {item.fullName}
            </Link>
            {item.role ? (
              <span className="ml-2 text-xs text-muted-foreground">
                {roleLabels[item.role] ?? item.role}
              </span>
            ) : null}
          </div>
          <Badge variant={overdueRows ? "destructive" : "secondary"}>
            {new Date(item.nextFollowUpAt).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Badge>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="space-y-6">
      <PageHeader title={t.followUpsTitle} description={t.followUpsDesc} />
      <CrmNav />

      {items.length === 0 ? (
        <EmptyState title={t.followUpsTitle} description={t.fuEmpty} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t.fuOverdue}{" "}
                <span className="text-muted-foreground">
                  ({overdue.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {overdue.length > 0 ? (
                renderList(overdue, true)
              ) : (
                <p className="text-sm text-muted-foreground">{t.fuEmpty}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t.fuUpcoming}{" "}
                <span className="text-muted-foreground">
                  ({upcoming.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcoming.length > 0 ? (
                renderList(upcoming, false)
              ) : (
                <p className="text-sm text-muted-foreground">{t.fuEmpty}</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
