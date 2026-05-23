import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MODULES, type ModuleId } from "@/lib/constants/modules";
import { requireOrganizationContext } from "@/server/organization-context";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const context = await requireOrganizationContext();

  // Состояние «нет организации» обрабатывает layout группы.
  if (!context.organization) {
    return null;
  }

  const { organization, role, modules, isSuperAdmin } = context;
  const totalModules = Object.keys(MODULES).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {organization.name}
        </h1>
        <p className="text-sm text-muted-foreground">Workspace overview.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Organization</CardDescription>
            <CardTitle className="text-base">{organization.name}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {organization.type} · {organization.default_currency} ·{" "}
            {organization.status}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Your role</CardDescription>
            <CardTitle className="text-base">{role?.name ?? "Member"}</CardTitle>
          </CardHeader>
          <CardContent>
            {isSuperAdmin ? (
              <Badge variant="secondary">Super Admin</Badge>
            ) : (
              <Badge variant="outline">{role?.key ?? "member"}</Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Enabled modules</CardDescription>
            <CardTitle className="text-base">{modules.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            of {totalModules} available
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Modules</CardTitle>
        </CardHeader>
        <CardContent>
          {modules.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {modules.map((moduleKey) => (
                <Badge key={moduleKey} variant="secondary">
                  {MODULES[moduleKey as ModuleId]?.name ?? moduleKey}
                </Badge>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No modules enabled"
              description="Modules will appear here once enabled for this organization."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
