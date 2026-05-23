import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  LEAD_STATUS_LABELS,
  LEAD_STATUS_OPTIONS,
  LEAD_TYPE_LABELS,
} from "@/features/crm/constants";
import { CrmNav } from "@/features/crm/crm-nav";
import { listLeads } from "@/features/crm/queries";
import type { LeadStatus } from "@/features/crm/types";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
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
  title: "Leads",
};

const FIELD_CLASS =
  "flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function parseStatus(value: string | undefined): LeadStatus | undefined {
  return LEAD_STATUS_OPTIONS.some((option) => option.value === value)
    ? (value as LeadStatus)
    : undefined;
}

export default async function CrmLeadsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return null;
  }
  if (!hasPermission(context, "crm.view")) {
    redirect(ROUTES.dashboard.root);
  }

  const status = parseStatus(searchParams.status);
  const leads = await listLeads(
    context.organization.id,
    status ? { status } : {},
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
        <p className="text-sm text-muted-foreground">
          Inquiries captured from your website and properties.
        </p>
      </div>
      <CrmNav />

      <form method="get" className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <label htmlFor="status" className="text-sm font-medium">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={status ?? ""}
            className={`${FIELD_CLASS} w-48`}
          >
            <option value="">All statuses</option>
            {LEAD_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className={buttonVariants({ variant: "outline" })}>
          Filter
        </button>
      </form>

      {leads.length > 0 ? (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contact</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
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
                    {lead.agentName ?? "Unassigned"}
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
      ) : (
        <EmptyState
          title="No leads found"
          description="Leads from your website forms will appear here."
        />
      )}
    </div>
  );
}
