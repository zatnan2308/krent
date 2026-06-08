import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getOrgAgents } from "@/features/crm/queries";
import { renderInbox } from "@/features/messaging/inbox-screen";
import type { MessagingChannel } from "@/features/messaging/types";
import { PORTAL_TYPE_LABELS } from "@/features/portal/constants";
import { listPortalAccounts } from "@/features/portal/queries";
import { listProperties } from "@/features/properties/dashboard-queries";
import { PageHeader } from "@/components/ui/page-header";
import { ROUTES } from "@/lib/constants/routes";
import { getServerDictionary } from "@/lib/i18n/runtime";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

export const metadata: Metadata = {
  title: "Messages",
};

export const dynamic = "force-dynamic";

type Filter = "all" | "portal" | MessagingChannel;

const VALID_FILTERS: Filter[] = [
  "all",
  "portal",
  "whatsapp_cloud",
  "telegram",
  "messenger",
];

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return null;
  }
  if (!hasPermission(context, "crm.view")) {
    redirect(ROUTES.dashboard.root);
  }

  const [accounts, properties, agents] = await Promise.all([
    listPortalAccounts(context.organization.id),
    listProperties(context.organization.id),
    getOrgAgents(context.organization.id),
  ]);
  const orgMembers = agents.filter((agent) => agent.id !== context.user.id);
  const portalAccounts = accounts
    .filter(
      (account) =>
        account.status === "active" || account.status === "pending",
    )
    .map((account) => ({
      id: account.id,
      label:
        `${account.contactName} · ${PORTAL_TYPE_LABELS[account.portalType]}` +
        (account.status === "pending" ? " · pending" : ""),
    }));

  const filterParam =
    typeof searchParams.filter === "string" ? searchParams.filter : "all";
  const filter: Filter = VALID_FILTERS.includes(filterParam as Filter)
    ? (filterParam as Filter)
    : "all";

  const dict = await getServerDictionary();

  return (
    <div className="space-y-4">
      <PageHeader
        title={dict.messaging.pageTitle}
        description={dict.messaging.pageDesc}
      />
      {await renderInbox({
        basePath: ROUTES.dashboard.messages,
        organizationId: context.organization.id,
        userId: context.user.id,
        activePortalId:
          typeof searchParams.c === "string" ? searchParams.c : null,
        activeChannelId:
          typeof searchParams.m === "string" ? searchParams.m : null,
        filter,
        portalAccounts,
        properties: properties.map((property) => ({
          id: property.id,
          title: property.title,
        })),
        orgMembers,
      })}
    </div>
  );
}
