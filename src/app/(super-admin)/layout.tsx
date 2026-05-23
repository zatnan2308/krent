import type { ReactNode } from "react";

import { SuperAdminLayout } from "@/components/layout/super-admin-layout";
import { requireUser } from "@/server/auth";
import { requireSuperAdmin } from "@/server/permissions";

// Зависит от сессии и прав Super Admin — всегда динамический рендер.
export const dynamic = "force-dynamic";

export default async function SuperAdminGroupLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireUser();
  await requireSuperAdmin();

  return (
    <SuperAdminLayout userEmail={user.email ?? ""}>{children}</SuperAdminLayout>
  );
}
