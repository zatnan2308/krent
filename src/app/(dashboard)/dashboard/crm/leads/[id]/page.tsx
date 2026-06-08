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
import { ChannelDeepLinks } from "@/features/messaging/channel-deep-links";
import { ContactChannels } from "@/features/messaging/contact-channels";
import {
  getContactChannels,
  getLeadMessagingLinks,
} from "@/features/messaging/queries";
import {
  getEntityActivity,
  getLead,
  getOrgAgents,
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
import { getServerDictionary } from "@/lib/i18n/runtime";
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

  const [notes, tasks, activity, agents, leadChannels, leadDeepLinks] =
    await Promise.all([
      listNotes(context.organization.id, { leadId: params.id }),
      listTasks(context.organization.id, { leadId: params.id }),
      getEntityActivity(context.organization.id, [params.id]),
      getOrgAgents(context.organization.id),
      getContactChannels(context.organization.id, detail.lead.contact_id),
      getLeadMessagingLinks(context.organization.id, params.id),
    ]);
  const canManage = hasPermission(context, "crm.manage");
  const { lead, contact, attribution } = detail;
  const dict = await getServerDictionary();
  const t = dict.dashCrm;

  const detailRows: { label: string; value: string }[] = [
    { label: t.type, value: LEAD_TYPE_LABELS[lead.type] },
    { label: t.source, value: lead.source ?? "—" },
  ];
  if (lead.source_domain) {
    detailRows.push({ label: t.sourceDomain, value: lead.source_domain });
  }
  if (lead.budget_min !== null || lead.budget_max !== null) {
    detailRows.push({
      label: t.budget,
      value: `${lead.budget_min ?? "—"} – ${lead.budget_max ?? "—"}`,
    });
  }
  if (lead.location_interest) {
    detailRows.push({
      label: t.locationInterest,
      value: lead.location_interest,
    });
  }
  if (lead.language) {
    detailRows.push({ label: t.language, value: lead.language });
  }
  if (lead.currency) {
    detailRows.push({ label: t.currency, value: lead.currency });
  }
  detailRows.push({
    label: t.colCreated,
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
          { label: dict.adminNav.crm, href: ROUTES.dashboard.crm },
          { label: t.navLeads, href: ROUTES.dashboard.crmLeads },
          { label: contact?.full_name ?? t.leadFallback },
        ]}
        title={contact?.full_name ?? t.leadFallback}
        actions={
          <Badge variant="secondary">{LEAD_STATUS_LABELS[lead.status]}</Badge>
        }
      />
      <CrmNav />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.leadDetails}</CardTitle>
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
                <p className="text-xs text-muted-foreground">{t.messageLabel}</p>
                <p className="mt-1 whitespace-pre-line text-sm">
                  {lead.message}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.contactLink}</CardTitle>
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
              <p className="text-muted-foreground">{t.noContactLinked}</p>
            )}
            {detail.propertyTitle ? (
              <p className="border-t pt-2 text-muted-foreground">
                {t.propertyLabel}:{" "}
                <span className="text-foreground">{detail.propertyTitle}</span>
              </p>
            ) : null}
            <p className="text-muted-foreground">
              {t.agentLabel}: {detail.agentName ?? t.unassigned}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.manage}</CardTitle>
          </CardHeader>
          <CardContent>
            <LeadControls
              leadId={lead.id}
              status={lead.status}
              assigned={lead.assigned_agent_id !== null}
              canManage={canManage}
              canManageAll={hasPermission(context, "crm.manage_all")}
              agents={agents}
              assignedAgentId={lead.assigned_agent_id}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.messaging}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ContactChannels channels={leadChannels} />
            {leadDeepLinks.length > 0 ? (
              <div className="border-t pt-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  {t.shareChatLink}
                </p>
                <ChannelDeepLinks links={leadDeepLinks} />
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.attribution}</CardTitle>
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
              {t.noAttribution}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.notes}</CardTitle>
        </CardHeader>
        <CardContent>
          <NotesPanel
            notes={notes}
            canManage={canManage}
            currentUserId={context.user.id}
            canManageAll={hasPermission(context, "crm.manage_all")}
            leadId={lead.id}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.navTasks}</CardTitle>
        </CardHeader>
        <CardContent>
          <TaskManager tasks={tasks} canManage={canManage} leadId={lead.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.activity}</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityTimeline items={activity} t={t} />
        </CardContent>
      </Card>
    </div>
  );
}
