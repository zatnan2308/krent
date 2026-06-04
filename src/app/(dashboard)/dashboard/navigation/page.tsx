import type { Metadata } from "next";

import { listPages } from "@/features/cms/dashboard-queries";
import { NavigationManager } from "@/features/cms/navigation-manager";
import { getNavigationItems } from "@/features/cms/navigation-queries";
import { requireOrganizationContext } from "@/server/organization-context";

export const metadata: Metadata = {
  title: "Navigation",
};

export default async function NavigationPage() {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return null;
  }

  const orgId = context.organization.id;
  const [header, footer, footerBrowse, footerAreas, footerLegal, pageList] =
    await Promise.all([
      getNavigationItems(orgId, "header"),
      getNavigationItems(orgId, "footer"),
      getNavigationItems(orgId, "footer_browse"),
      getNavigationItems(orgId, "footer_areas"),
      getNavigationItems(orgId, "footer_legal"),
      listPages(orgId, context.organization.default_language),
    ]);
  const pages = pageList
    .filter((page) => page.status === "published")
    .map((page) => ({ id: page.id, label: page.title }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Navigation</h1>
        <p className="text-sm text-muted-foreground">
          Header and footer menus of {context.organization.name}.
        </p>
      </div>
      <NavigationManager
        header={header}
        footer={footer}
        footerBrowse={footerBrowse}
        footerAreas={footerAreas}
        footerLegal={footerLegal}
        pages={pages}
      />
    </div>
  );
}
