import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ContactCreateForm } from "@/features/crm/contact-create-form";
import { ContactsCsvImport } from "@/features/crm/contacts-csv-import";
import { CrmNav } from "@/features/crm/crm-nav";
import { listContactsPage } from "@/features/crm/queries";
import { Badge } from "@/components/ui/badge";
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

const ROLES = ["buyer", "seller", "renter", "landlord", "investor", "other"];
const LIFECYCLES = [
  "new",
  "nurture",
  "active",
  "under_contract",
  "past_client",
  "sphere",
];
const TEMPS = ["hot", "warm", "cold"];

const FIELD_CLASS =
  "h-10 rounded-md border border-input bg-background px-3 text-sm shadow-xs transition-colors hover:border-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function str(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

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

  const q = str(searchParams.q);
  const role = str(searchParams.role);
  const lifecycle = str(searchParams.lifecycle);
  const temperature = str(searchParams.temperature);
  const tag = str(searchParams.tag);
  const pageParam = Number(str(searchParams.page) || "1");
  const requestedPage =
    Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;
  const {
    items: contacts,
    total,
    pageSize,
  } = await listContactsPage(context.organization.id, {
    q: q || undefined,
    role: role || undefined,
    lifecycle: lifecycle || undefined,
    temperature: temperature || undefined,
    tag: tag || undefined,
    page: requestedPage,
  });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const dict = await getServerDictionary();
  const t = dict.dashCrm;

  const roleLabels: Record<string, string> = {
    buyer: t.roleBuyer,
    seller: t.roleSeller,
    renter: t.roleRenter,
    landlord: t.roleLandlord,
    investor: t.roleInvestor,
    other: t.roleOther,
  };
  const lifecycleLabels: Record<string, string> = {
    new: t.lcNew,
    nurture: t.lcNurture,
    active: t.lcActive,
    under_contract: t.lcUnderContract,
    past_client: t.lcPastClient,
    sphere: t.lcSphere,
  };
  const tempLabels: Record<string, string> = {
    hot: t.tempHot,
    warm: t.tempWarm,
    cold: t.tempCold,
  };

  // Сохраняем поиск и фильтры при переходе между страницами.
  const buildPageHref = (target: number): string => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (role) params.set("role", role);
    if (lifecycle) params.set("lifecycle", lifecycle);
    if (temperature) params.set("temperature", temperature);
    if (tag) params.set("tag", tag);
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
          className={`${FIELD_CLASS} w-60`}
        />
        <select name="role" defaultValue={role} className={FIELD_CLASS}>
          <option value="">{t.filterAllRoles}</option>
          {ROLES.map((value) => (
            <option key={value} value={value}>
              {roleLabels[value]}
            </option>
          ))}
        </select>
        <select name="lifecycle" defaultValue={lifecycle} className={FIELD_CLASS}>
          <option value="">{t.filterAllStages}</option>
          {LIFECYCLES.map((value) => (
            <option key={value} value={value}>
              {lifecycleLabels[value]}
            </option>
          ))}
        </select>
        <select
          name="temperature"
          defaultValue={temperature}
          className={FIELD_CLASS}
        >
          <option value="">{t.filterAllTemps}</option>
          {TEMPS.map((value) => (
            <option key={value} value={value}>
              {tempLabels[value]}
            </option>
          ))}
        </select>
        <input
          type="text"
          name="tag"
          defaultValue={tag}
          placeholder={t.filterTagPh}
          className={`${FIELD_CLASS} w-40`}
        />
        <button
          type="submit"
          className="h-10 rounded-md border border-input bg-background px-4 text-sm font-medium shadow-xs transition-colors hover:bg-accent"
        >
          {t.filter}
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
                  <TableHead>{t.roleLabel}</TableHead>
                  <TableHead>{t.lifecycleLabel}</TableHead>
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
                      {contact.tags.length > 0 ? (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {contact.tags.slice(0, 4).map((tagName) => (
                            <span
                              key={tagName}
                              className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
                            >
                              {tagName}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {contact.email ?? "—"}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5">
                        {contact.role ? (
                          <Badge variant="secondary">
                            {roleLabels[contact.role] ?? contact.role}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                        {contact.temperature ? (
                          <span className="text-xs text-muted-foreground">
                            {tempLabels[contact.temperature] ??
                              contact.temperature}
                          </span>
                        ) : null}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {lifecycleLabels[contact.lifecycleStage] ??
                        contact.lifecycleStage}
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
        <EmptyState title={t.noContactsTitle} description={t.noContactsDesc} />
      )}
    </div>
  );
}
