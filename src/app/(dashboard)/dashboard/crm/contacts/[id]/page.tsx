import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  DEAL_STATUS_LABELS,
  LEAD_STATUS_LABELS,
  LEAD_TYPE_LABELS,
} from "@/features/crm/constants";
import { ActivityTimeline } from "@/features/crm/activity-timeline";
import { ContactPortalAccess } from "@/features/crm/contact-portal-access";
import { CrmNav } from "@/features/crm/crm-nav";
import { NotesPanel } from "@/features/crm/notes-panel";
import {
  getContact,
  getEntityActivity,
  listNotes,
} from "@/features/crm/queries";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ROUTES } from "@/lib/constants/routes";
import { createAdminClient } from "@/lib/supabase/server";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

export const metadata: Metadata = {
  title: "Contact",
};

export default async function ContactDetailPage({
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

  const detail = await getContact(context.organization.id, params.id);
  if (!detail) {
    notFound();
  }

  const notes = await listNotes(context.organization.id, {
    contactId: params.id,
  });
  const admin = createAdminClient();
  const { data: portalRows } = await admin
    .from("portal_accounts")
    .select("id, portal_type, status")
    .eq("organization_id", context.organization.id)
    .eq("contact_id", params.id)
    .order("created_at", { ascending: false });
  const portalAccounts = (portalRows ?? []).map((row) => ({
    id: row.id,
    portalType: row.portal_type,
    status: row.status,
  }));
  const canManage = hasPermission(context, "crm.manage");
  const { contact, leads, deals } = detail;
  const activity = await getEntityActivity(context.organization.id, [
    contact.id,
    ...leads.map((lead) => lead.id),
    ...deals.map((deal) => deal.id),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "CRM", href: ROUTES.dashboard.crm },
          { label: "Contacts", href: ROUTES.dashboard.crmContacts },
          { label: contact.full_name },
        ]}
        title={contact.full_name}
      />
      <CrmNav />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="text-muted-foreground">
              Email: {contact.email ?? "—"}
            </p>
            <p className="text-muted-foreground">
              Phone: {contact.phone ?? "—"}
            </p>
            <p className="text-muted-foreground">
              Language: {contact.preferred_language ?? "—"}
            </p>
            <p className="text-muted-foreground">
              Currency: {contact.preferred_currency ?? "—"}
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Leads</CardTitle>
          </CardHeader>
          <CardContent>
            {leads.length > 0 ? (
              <ul className="divide-y">
                {leads.map((lead) => (
                  <li
                    key={lead.id}
                    className="flex items-center justify-between gap-3 py-2"
                  >
                    <Link
                      href={`${ROUTES.dashboard.crmLeads}/${lead.id}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {LEAD_TYPE_LABELS[lead.type]}
                      {lead.propertyTitle ? ` · ${lead.propertyTitle}` : ""}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {LEAD_STATUS_LABELS[lead.status]}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No leads yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Portal access</CardTitle>
        </CardHeader>
        <CardContent>
          <ContactPortalAccess
            contactId={contact.id}
            accounts={portalAccounts}
            canManage={canManage}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Deals</CardTitle>
        </CardHeader>
        <CardContent>
          {deals.length > 0 ? (
            <ul className="divide-y">
              {deals.map((deal) => (
                <li
                  key={deal.id}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <span className="text-sm font-medium">{deal.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {deal.stageName ?? DEAL_STATUS_LABELS[deal.status]}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No deals yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <NotesPanel
            notes={notes}
            canManage={canManage}
            contactId={contact.id}
          />
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
