import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { renderChatScreen } from "@/features/chat/chat-screen";
import { PORTAL_TYPE_LABELS } from "@/features/portal/constants";
import { listPortalAccounts } from "@/features/portal/queries";
import { listProperties } from "@/features/properties/dashboard-queries";
import { ROUTES } from "@/lib/constants/routes";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

export const metadata: Metadata = {
  title: "Messages",
};

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

  const [accounts, properties] = await Promise.all([
    listPortalAccounts(context.organization.id),
    listProperties(context.organization.id),
  ]);
  const portalAccounts = accounts
    .filter((account) => account.status === "active")
    .map((account) => ({
      id: account.id,
      label: `${account.contactName} · ${PORTAL_TYPE_LABELS[account.portalType]}`,
    }));

  return renderChatScreen({
    basePath: ROUTES.dashboard.messages,
    activeConversationId:
      typeof searchParams.c === "string" ? searchParams.c : null,
    newConversation: {
      portalAccounts,
      properties: properties.map((property) => ({
        id: property.id,
        title: property.title,
      })),
    },
  });
}
