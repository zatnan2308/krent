import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { listContacts } from "@/features/crm/queries";
import { PORTAL_TYPE_LABELS } from "@/features/portal/constants";
import { InviteForm } from "@/features/portal/invite-form";
import { listPortalAccounts } from "@/features/portal/queries";
import { RevokeButton } from "@/features/portal/revoke-button";
import type { PortalAccountStatus } from "@/features/portal/types";
import { listProperties } from "@/features/properties/dashboard-queries";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ROUTES } from "@/lib/constants/routes";
import { getServerDictionary } from "@/lib/i18n/runtime";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

export const metadata: Metadata = {
  title: "Client portals",
};

function statusVariant(
  status: PortalAccountStatus,
): "success" | "warning" | "secondary" {
  if (status === "active") {
    return "success";
  }
  if (status === "pending") {
    return "warning";
  }
  return "secondary";
}

export default async function ClientsPage() {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return null;
  }
  if (!hasPermission(context, "crm.view")) {
    redirect(ROUTES.dashboard.root);
  }

  const canManage = hasPermission(context, "crm.manage");
  const [accounts, contacts, properties] = await Promise.all([
    listPortalAccounts(context.organization.id),
    listContacts(context.organization.id),
    listProperties(context.organization.id),
  ]);
  const dict = await getServerDictionary();
  const t = dict.dashClients;

  return (
    <div className="space-y-6">
      <PageHeader
        title={dict.adminNav.clientPortals}
        description={t.description}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.portalAccounts}</CardTitle>
        </CardHeader>
        <CardContent>
          {accounts.length > 0 ? (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.colContact}</TableHead>
                    <TableHead>{t.colPortal}</TableHead>
                    <TableHead>{t.colStatus}</TableHead>
                    <TableHead>{t.colInviteLink}</TableHead>
                    {canManage ? <TableHead /> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">
                        {account.contactName}
                        <p className="text-xs text-muted-foreground">
                          {account.email}
                        </p>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {PORTAL_TYPE_LABELS[account.portalType]}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(account.status)}>
                          {account.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs text-xs text-muted-foreground">
                        {account.status === "pending" &&
                        account.inviteToken ? (
                          <span className="break-all">
                            {`${ROUTES.portal.accept}?token=${account.inviteToken}`}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      {canManage ? (
                        <TableCell className="text-right">
                          {account.status !== "revoked" ? (
                            <RevokeButton accountId={account.id} />
                          ) : null}
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState title={t.emptyTitle} description={t.emptyDesc} />
          )}
        </CardContent>
      </Card>

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.inviteClient}</CardTitle>
          </CardHeader>
          <CardContent>
            <InviteForm
              contacts={contacts.map((contact) => ({
                id: contact.id,
                fullName: contact.fullName,
                email: contact.email,
              }))}
              properties={properties.map((property) => ({
                id: property.id,
                title: property.title,
              }))}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
