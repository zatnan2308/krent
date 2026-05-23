import Link from "next/link";
import type { ReactNode } from "react";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ROUTES } from "@/lib/constants/routes";
import { requireOrganizationContext } from "@/server/organization-context";

// Зависит от сессии и активной организации — всегда динамический рендер.
export const dynamic = "force-dynamic";

export default async function DashboardGroupLayout({
  children,
}: {
  children: ReactNode;
}) {
  const context = await requireOrganizationContext();

  // Без организации бизнес-данные не показываем.
  if (!context.organization) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>No organization yet</CardTitle>
            <CardDescription>
              Your account is not linked to any organization. An organization
              owner needs to add you to one.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href={ROUTES.public.home}
              className={buttonVariants({ variant: "outline" })}
            >
              Back to home
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <DashboardLayout
      organizations={context.organizations}
      activeOrganizationId={context.organization.id}
      userEmail={context.user.email ?? ""}
    >
      {children}
    </DashboardLayout>
  );
}
