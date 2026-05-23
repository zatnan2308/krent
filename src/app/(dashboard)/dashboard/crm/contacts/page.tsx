import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CrmNav } from "@/features/crm/crm-nav";
import { listContacts } from "@/features/crm/queries";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ROUTES } from "@/lib/constants/routes";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

export const metadata: Metadata = {
  title: "Contacts",
};

export default async function CrmContactsPage() {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return null;
  }
  if (!hasPermission(context, "crm.view")) {
    redirect(ROUTES.dashboard.root);
  }

  const contacts = await listContacts(context.organization.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Contacts</h1>
        <p className="text-sm text-muted-foreground">
          People who reached out to {context.organization.name}.
        </p>
      </div>
      <CrmNav />

      {contacts.length > 0 ? (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Added</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`${ROUTES.dashboard.crmContacts}/${contact.id}`}
                      className="hover:underline"
                    >
                      {contact.fullName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {contact.email ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {contact.phone ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(contact.createdAt).toLocaleDateString("en-US")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState
          title="No contacts yet"
          description="Contacts are created automatically when leads come in."
        />
      )}
    </div>
  );
}
