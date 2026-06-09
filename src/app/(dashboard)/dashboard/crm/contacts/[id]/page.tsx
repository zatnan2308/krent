import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  DEAL_STATUS_LABELS,
  LEAD_STATUS_LABELS,
  LEAD_TYPE_LABELS,
} from "@/features/crm/constants";
import { ActivityTimeline } from "@/features/crm/activity-timeline";
import { ContactEditForm } from "@/features/crm/contact-edit-form";
import { ContactMergeCard } from "@/features/crm/contact-merge-card";
import { ContactPortalAccess } from "@/features/crm/contact-portal-access";
import { ContactClassificationForm } from "@/features/crm/contact-classification-form";
import { ContactDocuments } from "@/features/crm/contact-documents";
import { ContactRelationships } from "@/features/crm/contact-relationships";
import { CrmDeleteButton } from "@/features/crm/crm-delete-button";
import { CrmNav } from "@/features/crm/crm-nav";
import { NotesPanel } from "@/features/crm/notes-panel";
import { ContactChannels } from "@/features/messaging/contact-channels";
import { getContactChannels } from "@/features/messaging/queries";
import {
  getContact,
  getEntityActivity,
  listContactOptions,
  listContactRelationships,
  listNotes,
} from "@/features/crm/queries";
import { listContactDocuments } from "@/features/portal/queries";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ROUTES } from "@/lib/constants/routes";
import { getServerDictionary } from "@/lib/i18n/runtime";
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
  const contactChannels = await getContactChannels(
    context.organization.id,
    params.id,
  );
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
  const canManageAll = hasPermission(context, "crm.manage_all");
  const [documents, contactOptions, relationships] = await Promise.all([
    listContactDocuments(context.organization.id, params.id),
    listContactOptions(context.organization.id),
    listContactRelationships(context.organization.id, params.id),
  ]);
  const { contact, leads, deals } = detail;
  const activity = await getEntityActivity(context.organization.id, [
    contact.id,
    ...leads.map((lead) => lead.id),
    ...deals.map((deal) => deal.id),
  ]);
  const dict = await getServerDictionary();
  const t = dict.dashCrm;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: dict.adminNav.crm, href: ROUTES.dashboard.crm },
          { label: t.navContacts, href: ROUTES.dashboard.crmContacts },
          { label: contact.full_name },
        ]}
        title={contact.full_name}
      />
      <CrmNav />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.contactDetails}</CardTitle>
          </CardHeader>
          <CardContent>
            <ContactEditForm
              contact={{
                id: contact.id,
                fullName: contact.full_name,
                email: contact.email,
                phone: contact.phone,
                language: contact.preferred_language,
                currency: contact.preferred_currency,
                contactKind: contact.contact_kind,
                companyName: contact.company_name,
                jobTitle: contact.job_title,
                secondaryPhone: contact.secondary_phone,
                secondaryEmail: contact.secondary_email,
                preferredChannel: contact.preferred_channel,
                bestTimeToContact: contact.best_time_to_contact,
                addressLine: contact.address_line,
                city: contact.city,
                postalCode: contact.postal_code,
                country: contact.country,
                dateOfBirth: contact.date_of_birth,
                referredByContactId: contact.referred_by_contact_id,
                referralNote: contact.referral_note,
              }}
              contactOptions={contactOptions}
              canManage={canManage}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{t.navLeads}</CardTitle>
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
              <p className="text-sm text-muted-foreground">{t.noLeadsYet}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.classificationTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <ContactClassificationForm
            contact={{
              id: contact.id,
              role: contact.role,
              lifecycleStage: contact.lifecycle_stage,
              temperature: contact.temperature,
              leadScore: contact.lead_score,
              priority: contact.priority,
              tags: contact.tags,
            }}
            canManage={canManage}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.relatedPeople}</CardTitle>
        </CardHeader>
        <CardContent>
          <ContactRelationships
            contactId={contact.id}
            items={relationships}
            contactOptions={contactOptions}
            canManage={canManage}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.portalAccess}</CardTitle>
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
          <CardTitle className="text-base">{t.messaging}</CardTitle>
        </CardHeader>
        <CardContent>
          <ContactChannels channels={contactChannels} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.documentsTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <ContactDocuments
            contactId={contact.id}
            documents={documents}
            canManage={canManage}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.navDeals}</CardTitle>
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
            <p className="text-sm text-muted-foreground">{t.noDealsYet}</p>
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
            contactId={contact.id}
          />
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

      {canManageAll ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t.mergeContact}</CardTitle>
            </CardHeader>
            <CardContent>
              <ContactMergeCard
                contactId={contact.id}
                contactName={contact.full_name}
              />
            </CardContent>
          </Card>
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="text-base">{t.deleteContactBtn}</CardTitle>
            </CardHeader>
            <CardContent>
              <CrmDeleteButton entity="contact" id={contact.id} />
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
