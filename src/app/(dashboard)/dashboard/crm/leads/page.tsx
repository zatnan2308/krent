import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  LEAD_STATUS_LABELS,
  LEAD_STATUS_OPTIONS,
  LEAD_TYPE_LABELS,
} from "@/features/crm/constants";
import { CrmNav } from "@/features/crm/crm-nav";
import {
  getLeadSourceBreakdown,
  listLeadSources,
  listLeadsPage,
  type LeadListItem,
} from "@/features/crm/queries";
import type { LeadStatus } from "@/features/crm/types";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  title: "Leads",
};

const FIELD_CLASS =
  "flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function parseStatus(value: string | undefined): LeadStatus | undefined {
  return LEAD_STATUS_OPTIONS.some((option) => option.value === value)
    ? (value as LeadStatus)
    : undefined;
}

function parseType(
  value: string | undefined,
): LeadListItem["type"] | undefined {
  if (value && Object.prototype.hasOwnProperty.call(LEAD_TYPE_LABELS, value)) {
    return value as LeadListItem["type"];
  }
  return undefined;
}

export default async function CrmLeadsPage({
  searchParams,
}: {
  searchParams: { status?: string; type?: string; source?: string; page?: string };
}) {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return null;
  }
  if (!hasPermission(context, "crm.view")) {
    redirect(ROUTES.dashboard.root);
  }

  const orgId = context.organization.id;
  const status = parseStatus(searchParams.status);
  const type = parseType(searchParams.type);
  const [sources, breakdown] = await Promise.all([
    listLeadSources(orgId),
    getLeadSourceBreakdown(orgId),
  ]);
  const source =
    searchParams.source &&
    sources.some((item) => item.key === searchParams.source)
      ? searchParams.source
      : undefined;
  const pageParam = Number(searchParams.page ?? "1");
  const requestedPage =
    Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;
  const {
    items: leads,
    total,
    pageSize,
  } = await listLeadsPage(orgId, {
    ...(status ? { status } : {}),
    ...(type ? { type } : {}),
    ...(source ? { source } : {}),
    page: requestedPage,
  });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const totalLeads = breakdown.reduce((sum, row) => sum + row.count, 0);
  const dict = await getServerDictionary();
  const t = dict.dashCrm;

  // Сохраняем активные фильтры при переходе между страницами.
  const buildPageHref = (target: number): string => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (type) params.set("type", type);
    if (source) params.set("source", source);
    if (target > 1) params.set("page", String(target));
    const qs = params.toString();
    return qs
      ? `${ROUTES.dashboard.crmLeads}?${qs}`
      : ROUTES.dashboard.crmLeads;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.navLeads}
        description={t.leadsDesc}
      />
      <CrmNav />

      <form
        method="get"
        className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4 shadow-sm"
      >
        <div className="space-y-1.5">
          <label htmlFor="status" className="text-sm font-medium">
            {t.status}
          </label>
          <select
            id="status"
            name="status"
            defaultValue={status ?? ""}
            className={`${FIELD_CLASS} w-48`}
          >
            <option value="">{t.allStatuses}</option>
            {LEAD_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="type" className="text-sm font-medium">
            {t.type}
          </label>
          <select
            id="type"
            name="type"
            defaultValue={type ?? ""}
            className={`${FIELD_CLASS} w-48`}
          >
            <option value="">{t.allTypes}</option>
            {Object.entries(LEAD_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="source" className="text-sm font-medium">
            {t.source}
          </label>
          <select
            id="source"
            name="source"
            defaultValue={source ?? ""}
            className={`${FIELD_CLASS} w-48`}
          >
            <option value="">{t.allSources}</option>
            {sources.map((item) => (
              <option key={item.key} value={item.key}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className={buttonVariants({ variant: "outline" })}>
          {t.filter}
        </button>
      </form>

      {breakdown.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.leadsBySource}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {breakdown.map((row) => {
                const pct =
                  totalLeads > 0
                    ? Math.round((row.count / totalLeads) * 100)
                    : 0;
                return (
                  <li key={row.key} className="text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span>{row.name}</span>
                      <span className="text-muted-foreground">
                        {row.count} · {pct}%
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary/70"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {leads.length > 0 ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {total} {t.leadsCount}
            {totalPages > 1
              ? ` · ${t.pageOf.replace("{page}", String(page)).replace("{total}", String(totalPages))}`
              : ""}
          </p>
          <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.colContact}</TableHead>
                <TableHead>{t.type}</TableHead>
                <TableHead>{t.colProperty}</TableHead>
                <TableHead>{t.colAgent}</TableHead>
                <TableHead>{t.status}</TableHead>
                <TableHead>{t.colCreated}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`${ROUTES.dashboard.crmLeads}/${lead.id}`}
                      className="hover:underline"
                    >
                      {lead.contactName}
                    </Link>
                    {lead.contactEmail ? (
                      <p className="text-xs text-muted-foreground">
                        {lead.contactEmail}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {LEAD_TYPE_LABELS[lead.type]}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {lead.propertyTitle ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {lead.agentName ?? t.unassigned}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {LEAD_STATUS_LABELS[lead.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(lead.createdAt).toLocaleDateString("en-US")}
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
          title={t.noLeadsTitle}
          description={t.noLeadsDesc}
        />
      )}
    </div>
  );
}
