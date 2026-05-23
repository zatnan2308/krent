"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";
import type { NotificationItem } from "@/components/layout/notifications-bell";
import type { OrganizationSummary } from "@/server/organization-context";

interface AppShellProps {
  variant: "dashboard" | "super-admin";
  organizations: OrganizationSummary[];
  activeOrganizationId: string;
  userEmail: string;
  userName?: string | null;
  avatarUrl?: string | null;
  notifications?: NotificationItem[];
  publicSiteUrl?: string | null;
  children: React.ReactNode;
}

/**
 * Адаптивная оболочка рабочего пространства: фиксированный sidebar на десктопе
 * и выезжающий drawer на мобильных. Используется dashboard и super-admin.
 */
export function AppShell({
  variant,
  organizations,
  activeOrganizationId,
  userEmail,
  userName,
  avatarUrl,
  notifications,
  publicSiteUrl,
  children,
}: AppShellProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="hidden border-r bg-background lg:block">
        <div className="sticky top-0 h-screen">
          <AppSidebar variant={variant} />
        </div>
      </aside>

      <DialogPrimitive.Root open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 lg:hidden" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className="fixed inset-y-0 left-0 z-50 w-64 bg-background shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left lg:hidden"
          >
            <DialogPrimitive.Title className="sr-only">
              Navigation
            </DialogPrimitive.Title>
            <AppSidebar
              variant={variant}
              onNavigate={() => setMobileOpen(false)}
            />
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <div className="flex min-h-screen flex-col">
        <AppTopbar
          variant={variant}
          organizations={organizations}
          activeOrganizationId={activeOrganizationId}
          userEmail={userEmail}
          userName={userName}
          avatarUrl={avatarUrl}
          notifications={notifications}
          publicSiteUrl={publicSiteUrl}
          onMenuClick={() => setMobileOpen(true)}
        />
        <main className="flex-1 bg-muted/30 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
