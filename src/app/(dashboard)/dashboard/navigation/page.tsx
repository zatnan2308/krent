import type { Metadata } from "next";

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

  const [header, footer] = await Promise.all([
    getNavigationItems(context.organization.id, "header"),
    getNavigationItems(context.organization.id, "footer"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Navigation</h1>
        <p className="text-sm text-muted-foreground">
          Header and footer menus of {context.organization.name}.
        </p>
      </div>
      <NavigationManager header={header} footer={footer} />
    </div>
  );
}
