import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";

import { HomeEditor } from "@/features/home/home-editor";
import { getHomeContent } from "@/features/home/queries";
import { PageHeader } from "@/components/ui/page-header";
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
      <PageHeader
        title="Home page"
        description={`Edit the content shown on the public home page of ${context.organization.name}. Changes appear on the live site immediately after save.`}
        actions={
          <a
            href={`/${context.organization.default_language}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-md border bg-background px-4 text-sm font-medium shadow-xs transition-colors hover:bg-accent"
          >
            <ExternalLink className="h-4 w-4" />
            View page
          </a>
        }
      />

      <HomeEditor content={content} />
    </div>
  );
}
