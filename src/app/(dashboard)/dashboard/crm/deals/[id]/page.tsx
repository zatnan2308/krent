import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { CrmNav } from "@/features/crm/crm-nav";
import { DealEditor } from "@/features/crm/deal-editor";
import { NotesPanel } from "@/features/crm/notes-panel";
import {
  getDeal,
  getDealStages,
  listNotes,
  listTasks,
} from "@/features/crm/queries";
import { TaskManager } from "@/features/crm/task-manager";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

  const [stages, notes, tasks] = await Promise.all([
    getDealStages(context.organization.id),
    listNotes(context.organization.id, { dealId: params.id }),
    listTasks(context.organization.id, { dealId: params.id }),
  ]);
  const canManage = hasPermission(context, "crm.manage");

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`${ROUTES.dashboard.crm}/deals`}
          className="text-sm text-muted-foreground hover:underline"
        >
          &larr; All deals
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            {deal.title}
          </h1>
          <Badge variant="secondary">{deal.status}</Badge>
        </div>
      </div>
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
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <NotesPanel notes={notes} canManage={canManage} dealId={deal.id} />
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
    </div>
  );
}
