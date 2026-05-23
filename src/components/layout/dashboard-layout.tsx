import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import type { OrganizationSummary } from "@/server/organization-context";

interface DashboardLayoutProps {
  organizations: OrganizationSummary[];
  activeOrganizationId: string;
  userEmail: string;
  children: ReactNode;
}

export function DashboardLayout({
  organizations,
  activeOrganizationId,
  userEmail,
  children,
}: DashboardLayoutProps) {
  return (
    <AppShell
      variant="dashboard"
      organizations={organizations}
      activeOrganizationId={activeOrganizationId}
      userEmail={userEmail}
    >
      {children}
    </AppShell>
  );
}
