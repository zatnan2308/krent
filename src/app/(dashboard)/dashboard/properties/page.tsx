import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

import {
  PROPERTY_PURPOSE_LABELS,
  PROPERTY_STATUS_LABELS,
  PROPERTY_TYPE_LABELS,
} from "@/features/properties/constants";
import { listProperties } from "@/features/properties/dashboard-queries";
import type { PropertyStatus } from "@/features/properties/types";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
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
  title: "Properties",
};

export const dynamic = "force-dynamic";

/** Вариант бейджа для статуса объекта. */
function statusVariant(
  status: PropertyStatus,
): "default" | "secondary" | "success" | "warning" | "outline" {
  switch (status) {
    case "active":
      return "success";
    case "pending":
      return "warning";
    case "sold":
    case "rented":
      return "default";
    case "archived":
    case "hidden":
      return "outline";
    default:
      return "secondary";
  }
}

export default async function PropertiesListPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return null;
  }

  const q = typeof searchParams.q === "string" ? searchParams.q : "";
  const status =
    typeof searchParams.status === "string" ? searchParams.status : "";
  const properties = await listProperties(context.organization.id, {
    q: q || undefined,
    status: (status || undefined) as PropertyStatus | undefined,
  });
  const canCreate = hasPermission(context, "properties.create");
  const canManageAmenities = hasPermission(context, "properties.manage_all");
  const defaultLocale = context.organization.default_language;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Properties"
        description={`Listings of ${context.organization.name}.`}
        actions={
          <>
            {canManageAmenities ? (
              <Link
                href={ROUTES.dashboard.propertiesAmenities}
                className={buttonVariants({ variant: "outline" })}
              >
                Amenities
              </Link>
            ) : null}
            {canCreate ? (
              <Link
                href={`${ROUTES.dashboard.properties}/new`}
                className={buttonVariants()}
              >
                New property
              </Link>
            ) : null}
          </>
        }
      />

      <form
        method="get"
        className="flex flex-wrap gap-2 rounded-lg border bg-card p-4 shadow-sm"
      >
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by title…"
          className="h-10 w-56 rounded-md border border-input bg-background px-3 text-sm shadow-xs transition-colors hover:border-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
        <select
          name="status"
          defaultValue={status}
          aria-label="Status filter"
          className="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-xs transition-colors hover:border-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="">All statuses</option>
          {Object.entries(PROPERTY_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className={buttonVariants({ variant: "outline" })}
        >
          Filter
        </button>
      </form>

      {properties.length > 0 ? (
        <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {properties.map((property) => (
                <TableRow key={property.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`${ROUTES.dashboard.properties}/${property.id}`}
                      className="hover:underline"
                    >
                      {property.title}
                    </Link>
                    <a
                      href={`/${defaultLocale}/properties/${property.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 inline-flex text-muted-foreground hover:text-foreground"
                      aria-label="View public page"
                    >
                      <ExternalLink className="inline h-3.5 w-3.5" />
                    </a>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {PROPERTY_TYPE_LABELS[property.propertyType]}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {PROPERTY_PURPOSE_LABELS[property.purpose]}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(property.status)}>
                      {PROPERTY_STATUS_LABELS[property.status]}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState
          title="No properties yet"
          description="Create your first property listing to get started."
        />
      )}
    </div>
  );
}
