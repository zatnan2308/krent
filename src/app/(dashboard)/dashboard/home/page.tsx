import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { HomeEditor } from "@/features/home/home-editor";
import { getHomeContent } from "@/features/home/queries";
import { ROUTES } from "@/lib/constants/routes";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

export const metadata: Metadata = {
  title: "Home page",
};

export const dynamic = "force-dynamic";

export default async function DashboardHomePage() {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return null;
  }
  // Право `branding.manage` уже даёт доступ к редактированию логотипа,
  // цветов и т.п. — логично использовать его и для контента главной.
  if (!hasPermission(context, "branding.manage")) {
    redirect(ROUTES.dashboard.root);
  }

  const content = await getHomeContent(context.organization.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Home page</h1>
        <p className="text-sm text-muted-foreground">
          Edit the content shown on the public home page of{" "}
          <strong>{context.organization.name}</strong>. Changes appear on the
          live site immediately after save.
        </p>
      </div>

      <HomeEditor content={content} />
    </div>
  );
}
