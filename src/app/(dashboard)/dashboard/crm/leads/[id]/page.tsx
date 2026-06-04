import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  LEAD_STATUS_LABELS,
  LEAD_TYPE_LABELS,
} from "@/features/crm/constants";
import { ActivityTimeline } from "@/features/crm/activity-timeline";
import { CrmNav } from "@/features/crm/crm-nav";
import { LeadControls } from "@/features/crm/lead-controls";
import { NotesPanel } from "@/features/crm/notes-panel";
import {
  getEntityActivity,
  getLead,
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
import { PageHeader } from "@/components/ui/page-header";
import { ROUTES } from "@/lib/constants/routes";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

export const metadata: Metadata = {
  title: "Lead",
};

export default async function LeadDetailPage({
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

  const detail = await getLead(context.organization.id, params.id);
  if (!detail) {
    notFound();
  }

  const [notes, tasks, activity] = await Promise.all([
    listNotes(context.organization.id, { leadId: params.id }),
    listTasks(context.organization.id, { leadId: params.id }),
    getEntityActivity(context.organization.id, [params.id]),
  ]);
  const canManage = hasPermission(context, "crm.manage");
  const { lead, contact, attribution } = detail;

  const detailRows: { label: string; value: string }[] = [
    { label: "Type", value: LEAD_TYPE_LABELS[lead.type] },
    { label: "Source", value: lead.source ?? "—" },
  ];
  if (lead.source_domain) {
    detailRows.push({ label: "Source domain", value: lead.source_domain });
  }
  if (lead.budget_min !== null || lead.budget_max !== null) {
    detailRows.push({
      label: "Budget",
      value: `${lead.budget_min ?? "—"} – ${lead.budget_max ?? "—"}`,
    });
  }
  if (lead.location_interest) {
    detailRows.push({
      label: "Location interest",
      value: lead.location_interest,
    });
  }
  if (lead.language) {
    detailRows.push({ label: "Language", value: lead.language });
  }
  if (lead.currency) {
    detailRows.push({ label: "Currency", value: lead.currency });
  }
  detailRows.push({
    label: "Created",
    value: new Date(lead.created_at).toLocaleString("en-US"),
  });

  const attributionRows: { label: string; value: string }[] = [];
  if (attribution) {
    const fields: [string, string | null][] = [
      ["UTM source", attribution.utm_source],
      ["UTM medium", attribution.utm_medium],
      ["UTM campaign", attribution.utm_campaign],
      ["UTM content", attribution.utm_content],
      ["UTM term", attribution.utm_term],
      ["gclid", attribution.gclid],
      ["gbraid", attribution.gbraid],
      ["wbraid", attribution.wbraid],
      ["fbclid", attribution.fbclid],
      ["fbc", attribution.fbc],
      ["fbp", attribution.fbp],
      ["Landing page", attribution.landing_page],
      ["First page", attribution.first_page],
      ["Last page", attribution.last_page],
      ["Referrer", attribution.referrer],
      ["Device", attribution.device],
      ["Country", attribution.country],
      ["City", attribution.city],
    ];
    for (const [label, value] of fields) {
      if (value && value.trim() !== "") {
        attributionRows.push({ label, value });
      }
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "CRM", href: ROUTES.dashboard.crm },
          { label: "Leads", href: ROUTES.dashboard.crmLeads },
          { label: contact?.full_name ?? "Lead" },
        ]}
        title={contact?.full_name ?? "Lead"}
        actions={
          <Badge variant="secondary">{LEAD_STATUS_LABELS[lead.status]}</Badge>
        }
      />
      <CrmNav />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lead details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              {detailRows.map((row) => (
                <div key={row.label} className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{row.label}</dt>
                  <dd className="text-right font-medium">{row.value}</dd>
                </div>
              ))}
            </dl>
            {lead.message ? (
              <div className="mt-3 border-t pt-3">
                <p className="text-xs text-muted-foreground">Message</p>
                <p className="mt-1 whitespace-pre-line text-sm">
                  {lead.message}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {contact ? (
              <>
                <Link
                  href={`${ROUTES.dashboard.crmContacts}/${contact.id}`}
                  className="font-medium hover:underline"
                >
                  {contact.full_name}
                </Link>
                {contact.email ? (
                  <p className="text-muted-foreground">{contact.email}</p>
                ) : null}
                {contact.phone ? (
                  <p className="text-muted-foreground">{contact.phone}</p>
                ) : null}
              </>
            ) : (
              <p className="text-muted-foreground">No contact linked.</p>
            )}
            {detail.propertyTitle ? (
              <p className="border-t pt-2 text-muted-foreground">
                Property:{" "}
                <span className="text-foreground">{detail.propertyTitle}</span>
              </p>
            ) : null}
            <p className="text-muted-foreground">
              Agent: {detail.agentName ?? "Unassigned"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Manage</CardTitle>
          </CardHeader>
          <CardContent>
            <LeadControls
              leadId={lead.id}
              status={lead.status}
              assigned={lead.assigned_agent_id !== null}
              canManage={canManage}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Attribution</CardTitle>
        </CardHeader>
        <CardContent>
          {attributionRows.length > 0 ? (
            <dl className="grid gap-2 sm:grid-cols-2">
              {attributionRows.map((row) => (
                <div
                  key={row.label}
                  className="flex justify-between gap-3 text-sm"
                >
                  <dt className="shrink-0 text-muted-foreground">
                    {row.label}
                  </dt>
                  <dd className="truncate text-right font-medium">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">
              No marketing attribution captured for this lead.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <NotesPanel notes={notes} canManage={canManage} leadId={lead.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <TaskManager tasks={tasks} canManage={canManage} leadId={lead.id} />
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
