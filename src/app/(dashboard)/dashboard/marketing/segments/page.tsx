import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MarketingNav } from "@/features/campaigns/marketing-nav";
import { listSegments } from "@/features/campaigns/queries";
import { SegmentManager } from "@/features/campaigns/segment-manager";
import { provisionSystemSegments } from "@/features/campaigns/segments";
import { ROUTES } from "@/lib/constants/routes";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

export const metadata: Metadata = {
  title: "Contact segments",
};

export default async function MarketingSegmentsPage() {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return null;
  }
  if (!hasPermission(context, "marketing.manage")) {
    redirect(ROUTES.dashboard.root);
  }

  await provisionSystemSegments(context.organization.id);
  const segments = await listSegments(context.organization.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Contact segments
        </h1>
        <p className="text-sm text-muted-foreground">
          Audiences for campaigns. System segments cover buyers, sellers,
          guests and acquisition channels.
        </p>
      </div>
      <MarketingNav />
      <SegmentManager segments={segments} />
    </div>
  );
}
