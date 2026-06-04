import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ConsentToggle } from "@/features/campaigns/consent-toggle";
import { MarketingNav } from "@/features/campaigns/marketing-nav";
import { listMarketingContacts } from "@/features/campaigns/queries";
import { Badge } from "@/components/ui/badge";
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
  title: "Marketing contacts",
};

export default async function MarketingContactsPage() {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return null;
  }
  if (!hasPermission(context, "marketing.manage")) {
    redirect(ROUTES.dashboard.root);
  }

  const contacts = await listMarketingContacts(context.organization.id);
  const subscribedCount = contacts.filter(
    (contact) => contact.subscribed,
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketing contacts"
        description={`${subscribedCount} of ${contacts.length} contact(s) subscribed to marketing email.`}
      />
      <MarketingNav />

      {contacts.length > 0 ? (
        <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contact</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Language</TableHead>
                <TableHead>Marketing</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell className="font-medium">
                    {contact.fullName}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {contact.email ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {contact.language ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        contact.subscribed ? "secondary" : "outline"
                      }
                    >
                      {contact.subscribed ? "Subscribed" : "Unsubscribed"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <ConsentToggle
                      contactId={contact.id}
                      subscribed={contact.subscribed}
                      disabled={contact.email === null}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState
          title="No contacts yet"
          description="Contacts captured from your website forms will appear here."
        />
      )}
    </div>
  );
}
