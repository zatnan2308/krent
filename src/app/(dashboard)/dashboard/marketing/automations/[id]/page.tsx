import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { AutomationEditor } from "@/features/automations/automation-editor";
import { getAutomationFlow } from "@/features/automations/queries";
import { MarketingNav } from "@/features/campaigns/marketing-nav";
import { PageHeader } from "@/components/ui/page-header";
import { ROUTES } from "@/lib/constants/routes";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

export const metadata: Metadata = {
  title: "Automation",
};

export const dynamic = "force-dynamic";

export default async function AutomationEditorPage({
  params,
}: {
  params: { id: string };
}) {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return null;
  }
  if (!hasPermission(context, "marketing.manage")) {
    redirect(ROUTES.dashboard.root);
  }

  const detail = await getAutomationFlow(context.organization.id, params.id);
  if (!detail) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          {
            label: "Automations",
            href: ROUTES.dashboard.marketingAutomations,
          },
          { label: detail.flow.name },
        ]}
        title={detail.flow.name}
      />
      <MarketingNav />
      <AutomationEditor
        flow={{
          id: detail.flow.id,
          name: detail.flow.name,
          triggerEvent: detail.flow.trigger_event,
          description: detail.flow.description,
          isActive: detail.flow.is_active,
        }}
        steps={detail.steps}
      />
    </div>
  );
}
