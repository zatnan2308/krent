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
import { ROUTES } from "@/lib/constants/routes";
import { getServerDictionary } from "@/lib/i18n/runtime";

export const metadata: Metadata = {
  title: "Organizations · Super Admin",
};

export const dynamic = "force-dynamic";

export default async function OrganizationsListPage() {
  const organizations = await listOrganizationOverviews();
  const dict = await getServerDictionary();
  const t = dict.superAdmin;
  return (
    <div className="space-y-6">
      <PageHeader
        title={dict.adminNav.organizations}
        description={t.orgsDesc}
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.allOrganizations}</CardTitle>
        </CardHeader>
        <CardContent>
          {organizations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t.noOrganizations}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.colName}</TableHead>
                  <TableHead>{t.colSlug}</TableHead>
                  <TableHead>{t.colType}</TableHead>
                  <TableHead>{t.colStatus}</TableHead>
                  <TableHead>{t.colCreated}</TableHead>
                  <TableHead>{t.members}</TableHead>
                  <TableHead>{t.properties}</TableHead>
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
