import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";

interface SuperAdminLayoutProps {
  userEmail: string;
  children: ReactNode;
}

export function SuperAdminLayout({
  userEmail,
  children,
}: SuperAdminLayoutProps) {
  return (
    <AppShell
      variant="super-admin"
      organizations={[]}
      activeOrganizationId=""
      userEmail={userEmail}
    >
      {children}
    </AppShell>
  );
}
