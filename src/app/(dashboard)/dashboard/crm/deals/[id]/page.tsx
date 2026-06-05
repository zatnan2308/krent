import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ActivityTimeline } from "@/features/crm/activity-timeline";
import { CrmNav } from "@/features/crm/crm-nav";
import { DealEditor } from "@/features/crm/deal-editor";
import { NotesPanel } from "@/features/crm/notes-panel";
import {
  getDeal,
  getDealStages,
  getEntityActivity,
  listNotes,
  listTasks,
} from "@/features/crm/queries";
import { ContactChannels } from "@/features/messaging/contact-channels";
import { getContactChannels } from "@/features/messaging/queries";
import { TaskManager } from "@/features/crm/task-manager";
import { Badge } from "@/components/ui/badge";
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
  title: "Deal",
};

export default async function DealDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return null;
  }
  if (!hasPermission(context, "crm.view")) {
    redirect(ROUTES.dashboard.root);
  }

  const deal = await getDeal(context.organization.id, params.id);
  if (!deal) {
    notFound();
  }

  const [stages, notes, tasks, activity, dealChannels] = await Promise.all([
    getDealStages(context.organization.id),
    listNotes(context.organization.id, { dealId: params.id }),
    listTasks(context.organization.id, { dealId: params.id }),
    getEntityActivity(context.organization.id, [params.id]),
    deal.contactId
      ? getContactChannels(context.organization.id, deal.contactId)
      : Promise.resolve([]),
  ]);
  const canManage = hasPermission(context, "crm.manage");

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "CRM", href: ROUTES.dashboard.crm },
          { label: "Deals", href: ROUTES.dashboard.crmDeals },
          { label: deal.title },
        ]}
        title={deal.title}
        actions={<Badge variant="secondary">{deal.status}</Badge>}
      />
      <CrmNav />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Deal</CardTitle>
          </CardHeader>
          <CardContent>
            <DealEditor deal={deal} stages={stages} canManage={canManage} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <Link
              href={`${ROUTES.dashboard.crmContacts}/${deal.contactId}`}
              className="font-medium hover:underline"
            >
              {deal.contactName}
            </Link>
            {deal.contactEmail ? (
              <p className="text-muted-foreground">{deal.contactEmail}</p>
            ) : null}
            {deal.propertyTitle ? (
              <p className="border-t pt-2 text-muted-foreground">
                Property:{" "}
                <span className="text-foreground">{deal.propertyTitle}</span>
              </p>
            ) : null}
            <p className="text-muted-foreground">
              Agent: {deal.agentName ?? "Unassigned"}
            </p>
            {dealChannels.length > 0 ? (
              <div className="border-t pt-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Messaging
                </p>
                <ContactChannels channels={dealChannels} />
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <NotesPanel
            notes={notes}
            canManage={canManage}
            currentUserId={context.user.id}
            canManageAll={hasPermission(context, "crm.manage_all")}
            dealId={deal.id}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <TaskManager tasks={tasks} canManage={canManage} dealId={deal.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityTimeline items={activity} />
        </CardContent>
      </Card>
    </div>
  );
}
