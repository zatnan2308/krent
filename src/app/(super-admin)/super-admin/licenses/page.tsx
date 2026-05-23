import type { Metadata } from "next";
import Link from "next/link";

import { LicenseForm } from "@/features/super-admin/license-form";
import { LicenseStatusButtons } from "@/features/super-admin/license-status-buttons";
import { listOrganizationOverviews } from "@/features/super-admin/queries";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createAdminClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/constants/routes";

export const metadata: Metadata = {
  title: "Licenses · Super Admin",
};

export const dynamic = "force-dynamic";

export default async function LicensesPage() {
  const admin = createAdminClient();
  const [{ data: licenses }, organizations] = await Promise.all([
    admin
      .from("licenses")
      .select(
        "id, organization_id, license_key, status, installation_type, client_name, client_email, domain, product_version, issued_at, support_until, updates_until, expires_at, notes, organizations(name)",
      )
      .order("issued_at", { ascending: false }),
    listOrganizationOverviews(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Licenses</h1>
        <p className="text-sm text-muted-foreground">
          Issue and manage installation licenses. A license identifies which
          client received a copy of the platform — it does not gate individual
          features. To enable or disable modules technically, use
          <code> organization → modules</code>.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Issue a new license</CardTitle>
        </CardHeader>
        <CardContent>
          <LicenseForm
            organizations={organizations.map((row) => ({
              id: row.id,
              name: row.name,
            }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All licenses</CardTitle>
        </CardHeader>
        <CardContent>
          {licenses && licenses.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {licenses.map((row) => (
                <li key={row.id} className="rounded-md border p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-medium">
                        {row.client_name ?? "—"}
                        <span className="ml-2 text-xs text-muted-foreground">
                          · {row.installation_type}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Organization:{" "}
                        <Link
                          href={ROUTES.superAdmin.organizationDetail(
                            row.organization_id,
                          )}
                          className="underline"
                        >
                          {(row.organizations as { name: string | null } | null)
                            ?.name ?? row.organization_id}
                        </Link>{" "}
                        · Domain: {row.domain ?? "—"} · Version:{" "}
                        {row.product_version ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Issued{" "}
                        {new Date(row.issued_at).toLocaleDateString()}
                        {row.support_until
                          ? ` · Support until ${new Date(row.support_until).toLocaleDateString()}`
                          : ""}
                        {row.updates_until
                          ? ` · Updates until ${new Date(row.updates_until).toLocaleDateString()}`
                          : ""}
                        {row.expires_at
                          ? ` · Expires ${new Date(row.expires_at).toLocaleDateString()}`
                          : ""}
                      </p>
                      <p className="break-all font-mono text-xs text-muted-foreground">
                        {row.license_key}
                      </p>
                      {row.notes ? (
                        <p className="text-xs">{row.notes}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge
                        variant={
                          row.status === "active"
                            ? "default"
                            : row.status === "revoked"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {row.status}
                      </Badge>
                      <LicenseStatusButtons id={row.id} status={row.status} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No licenses issued yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
