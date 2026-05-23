import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CrmNav } from "@/features/crm/crm-nav";
import { DealBoard } from "@/features/crm/deal-board";
import { getDealStages, listDeals } from "@/features/crm/queries";
import { ROUTES } from "@/lib/constants/routes";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

export const metadata: Metadata = {
  title: "Deals",
};

export default async function CrmDealsPage() {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return null;
  }
  if (!hasPermission(context, "crm.view")) {
    redirect(ROUTES.dashboard.root);
  }

  const [stages, deals] = await Promise.all([
    getDealStages(context.organization.id),
    listDeals(context.organization.id),
  ]);
  const canManage = hasPermission(context, "crm.manage");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Deal pipeline</h1>
        <p className="text-sm text-muted-foreground">
          Deals progress through the stages of your sales pipeline.
        </p>
      </div>
      <CrmNav />
      <DealBoard stages={stages} deals={deals} canManage={canManage} />
    </div>
  );
}
