import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ContactsCsvImport } from "@/features/crm/contacts-csv-import";
import { CrmNav } from "@/features/crm/crm-nav";
import { listContacts } from "@/features/crm/queries";
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
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

export const metadata: Metadata = {
  title: "Contacts",
};

export const dynamic = "force-dynamic";

export default async function CrmContactsPage({
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

  const q = typeof searchParams.q === "string" ? searchParams.q : "";
  const contacts = await listContacts(context.organization.id, {
    q: q || undefined,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contacts"
        description={`People who reached out to ${context.organization.name}.`}
      />
      <CrmNav />

      <ContactsCsvImport />

      <form
        method="get"
        className="flex flex-wrap gap-2 rounded-lg border bg-card p-4 shadow-sm"
      >
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search name, email or phone…"
          className="h-10 w-72 rounded-md border border-input bg-background px-3 text-sm shadow-xs transition-colors hover:border-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
        <button
          type="submit"
          className="h-10 rounded-md border border-input bg-background px-4 text-sm font-medium shadow-xs transition-colors hover:bg-accent"
        >
          Search
        </button>
      </form>

      {contacts.length > 0 ? (
        <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
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
