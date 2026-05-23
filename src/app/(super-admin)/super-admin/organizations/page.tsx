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
import { ROUTES } from "@/lib/constants/routes";

export const metadata: Metadata = {
  title: "Organizations · Super Admin",
};

export const dynamic = "force-dynamic";

export default async function OrganizationsListPage() {
  const organizations = await listOrganizationOverviews();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Organizations</h1>
        <p className="text-sm text-muted-foreground">
          All tenants on this Krent deployment.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All organizations</CardTitle>
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
                  <TableHead>Slug</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
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
                    <TableCell>
                      <code className="text-xs">{org.slug}</code>
                    </TableCell>
                    <TableCell className="capitalize">{org.type}</TableCell>
                    <TableCell>
                      <Badge variant={org.status === "active" ? "default" : "secondary"}>
                        {org.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {new Date(org.createdAt).toLocaleDateString()}
                      </span>
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
