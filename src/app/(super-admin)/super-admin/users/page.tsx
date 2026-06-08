import type { Metadata } from "next";
import Link from "next/link";

import { listPlatformUsers } from "@/features/super-admin/queries";
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
  title: "Users · Super Admin",
};

export const dynamic = "force-dynamic";

export default async function PlatformUsersPage() {
  const users = await listPlatformUsers(100);
  const dict = await getServerDictionary();
  const t = dict.superAdmin;
  return (
    <div className="space-y-6">
      <PageHeader
        title={dict.adminNav.users}
        description={t.usersDesc}
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.allUsers}</CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.noUsers}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.colEmail}</TableHead>
                  <TableHead>{t.organizations}</TableHead>
                  <TableHead>{t.colCreated}</TableHead>
                  <TableHead>{t.colLastSignIn}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.email ?? <code className="text-xs">{user.id}</code>}
                    </TableCell>
                    <TableCell className="space-x-2">
                      {user.memberships.length === 0 ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        user.memberships.map((membership) => (
                          <Link
                            key={membership.organizationId}
                            href={ROUTES.superAdmin.organizationDetail(
                              membership.organizationId,
                            )}
                            className="text-xs underline"
                          >
                            {membership.organizationName}
                          </Link>
                        ))
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {user.lastSignInAt
                          ? new Date(user.lastSignInAt).toLocaleString()
                          : t.never}
                      </span>
                    </TableCell>
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
