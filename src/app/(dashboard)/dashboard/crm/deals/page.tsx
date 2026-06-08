import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CrmNav } from "@/features/crm/crm-nav";
import { DealBoard } from "@/features/crm/deal-board";
import { getDealStages, listDeals } from "@/features/crm/queries";
import { PageHeader } from "@/components/ui/page-header";
import { ROUTES } from "@/lib/constants/routes";
import { getServerDictionary } from "@/lib/i18n/runtime";
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
  const dict = await getServerDictionary();
  const t = dict.dashCrm;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.dealsTitle}
        description={t.dealsDesc}
      />
      <CrmNav />
      <DealBoard stages={stages} deals={deals} canManage={canManage} />
    </div>
  );
}
