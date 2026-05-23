import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import type { NotificationItem } from "@/components/layout/notifications-bell";
import type { OrganizationSummary } from "@/server/organization-context";

interface DashboardLayoutProps {
  organizations: OrganizationSummary[];
  activeOrganizationId: string;
  userEmail: string;
  userName?: string | null;
  avatarUrl?: string | null;
  notifications?: NotificationItem[];
  publicSiteUrl?: string | null;
  children: ReactNode;
}

export function DashboardLayout({
  organizations,
  activeOrganizationId,
  userEmail,
  userName,
  avatarUrl,
  notifications,
  publicSiteUrl,
  children,
}: DashboardLayoutProps) {
  return (
    <AppShell
      variant="dashboard"
      organizations={organizations}
      activeOrganizationId={activeOrganizationId}
      userEmail={userEmail}
      userName={userName}
      avatarUrl={avatarUrl}
      notifications={notifications}
      publicSiteUrl={publicSiteUrl}
    >
      {children}
    </AppShell>
  );
}
