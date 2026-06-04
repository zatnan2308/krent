import Link from "next/link";
import type { ReactNode } from "react";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { getUnreadMessagesCount } from "@/features/chat/unread-queries";
import { listRecentNotificationsForBell } from "@/features/notifications/queries-bell";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ROUTES } from "@/lib/constants/routes";
import { createAdminClient } from "@/lib/supabase/server";
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

  const meta = (context.user.user_metadata ?? {}) as Record<string, unknown>;
  const userName =
    typeof meta.full_name === "string" && meta.full_name.trim().length > 0
      ? meta.full_name
      : null;
  const avatarUrl =
    typeof meta.avatar_url === "string" && meta.avatar_url.trim().length > 0
      ? meta.avatar_url
      : null;

  // Public site URL — резолвим verified primary domain организации.
  const admin = createAdminClient();
  const { data: primary } = await admin
    .from("domains")
    .select("domain")
    .eq("organization_id", context.organization.id)
    .eq("status", "verified")
    .eq("type", "primary")
    .maybeSingle();
  const publicSiteUrl = primary?.domain ? `https://${primary.domain}` : null;

  const [notifications, unreadMessages] = await Promise.all([
    listRecentNotificationsForBell(context.organization.id),
    getUnreadMessagesCount(context.organization.id, context.user.id),
  ]);
  const sidebarBadges: Record<string, number> = {};
  if (unreadMessages > 0) {
    sidebarBadges[ROUTES.dashboard.messages] = unreadMessages;
  }

  return (
    <DashboardLayout
      organizations={context.organizations}
      activeOrganizationId={context.organization.id}
      userEmail={context.user.email ?? ""}
      userName={userName}
      avatarUrl={avatarUrl}
      notifications={notifications}
      publicSiteUrl={publicSiteUrl}
      sidebarBadges={sidebarBadges}
      permissions={context.permissions}
      isSuperAdmin={context.isSuperAdmin}
    >
      {children}
    </DashboardLayout>
  );
}
