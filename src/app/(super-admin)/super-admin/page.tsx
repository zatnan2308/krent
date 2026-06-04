import type { Metadata } from "next";
import Link from "next/link";

import { listOrganizationOverviews } from "@/features/super-admin/queries";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { ROUTES } from "@/lib/constants/routes";

export const metadata: Metadata = {
  title: "Super Admin",
};

export const dynamic = "force-dynamic";

function statusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "active") return "default";
  if (status === "suspended") return "destructive";
  return "secondary";
}

export default async function SuperAdminPage() {
  const organizations = await listOrganizationOverviews();
  const totals = {
    orgs: organizations.length,
    members: organizations.reduce((acc, row) => acc + row.memberCount, 0),
    properties: organizations.reduce((acc, row) => acc + row.propertyCount, 0),
    suspended: organizations.filter((row) => row.status === "suspended").length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Super Admin"
        description="Platform-wide management of organizations."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Organizations", value: totals.orgs },
          { label: "Suspended", value: totals.suspended },
          { label: "Members", value: totals.members },
          { label: "Properties", value: totals.properties },
        ].map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Organizations</CardTitle>
        </CardHeader>
        <CardContent>
          {organizations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No organizations yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>License</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Properties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organizations.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={ROUTES.superAdmin.organizationDetail(org.id)}
                        className="hover:underline"
                      >
                        {org.name}
                      </Link>
                    </TableCell>
                    <TableCell className="capitalize">{org.type}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(org.status)}>
                        {org.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {org.licenseStatus ? (
                        <span className="text-xs">
                          {org.licenseStatus}
                          {org.licenseExpiresAt
                            ? ` · expires ${new Date(org.licenseExpiresAt).toLocaleDateString()}`
                            : ""}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{org.memberCount}</TableCell>
                    <TableCell>{org.propertyCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
