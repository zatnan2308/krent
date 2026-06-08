import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ContactCreateForm } from "@/features/crm/contact-create-form";
import { ContactsCsvImport } from "@/features/crm/contacts-csv-import";
import { CrmNav } from "@/features/crm/crm-nav";
import { listContactsPage } from "@/features/crm/queries";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
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
  const pageParam = Number(
    typeof searchParams.page === "string" ? searchParams.page : "1",
  );
  const requestedPage =
    Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;
  const {
    items: contacts,
    total,
    pageSize,
  } = await listContactsPage(context.organization.id, {
    q: q || undefined,
    page: requestedPage,
  });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const dict = await getServerDictionary();
  const t = dict.dashCrm;

  // Сохраняем поиск при переходе между страницами.
  const buildPageHref = (target: number): string => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (target > 1) params.set("page", String(target));
    const qs = params.toString();
    return qs
      ? `${ROUTES.dashboard.crmContacts}?${qs}`
      : ROUTES.dashboard.crmContacts;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.navContacts}
        description={t.contactsDesc.replace("{name}", context.organization.name)}
      />
      <CrmNav />

      {hasPermission(context, "crm.manage") ? <ContactCreateForm /> : null}

      <ContactsCsvImport />

      <form
        method="get"
        className="flex flex-wrap gap-2 rounded-lg border bg-card p-4 shadow-sm"
      >
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder={t.searchContactsPh}
          className="h-10 w-72 rounded-md border border-input bg-background px-3 text-sm shadow-xs transition-colors hover:border-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
        <button
          type="submit"
          className="h-10 rounded-md border border-input bg-background px-4 text-sm font-medium shadow-xs transition-colors hover:bg-accent"
        >
          {t.searchBtn}
        </button>
      </form>

      {contacts.length > 0 ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {total} {t.contactsCount}
            {totalPages > 1
              ? ` · ${t.pageOf.replace("{page}", String(page)).replace("{total}", String(totalPages))}`
              : ""}
          </p>
          <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.colName}</TableHead>
                <TableHead>{t.colEmail}</TableHead>
                <TableHead>{t.colPhone}</TableHead>
                <TableHead>{t.colAdded}</TableHead>
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
          <Pagination
            page={page}
            totalPages={totalPages}
            getHref={buildPageHref}
          />
        </div>
      ) : (
        <EmptyState
          title={t.noContactsTitle}
          description={t.noContactsDesc}
        />
      )}
    </div>
  );
}
