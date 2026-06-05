import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { CampaignEditor } from "@/features/campaigns/campaign-editor";
import { getCampaignEditorData } from "@/features/campaigns/queries";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ROUTES } from "@/lib/constants/routes";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

export const metadata: Metadata = {
  title: "Campaign",
};

export default async function CampaignPage({
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

  const data = await getCampaignEditorData(
    context.organization.id,
    params.id,
  );
  if (!data) {
    notFound();
  }
  const report = data.report;

  const reportStats: { label: string; value: number; muted?: boolean }[] = [
    { label: "Recipients", value: report?.total_recipients ?? 0 },
    { label: "Sent", value: report?.sent_count ?? 0 },
    { label: "Failed", value: report?.failed_count ?? 0 },
    { label: "Skipped", value: report?.skipped_count ?? 0 },
    {
      label: "Delivered",
      value: report?.delivered_count ?? 0,
      muted: true,
    },
    { label: "Opened", value: report?.opened_count ?? 0, muted: true },
    { label: "Clicked", value: report?.clicked_count ?? 0, muted: true },
    {
      label: "Unsubscribed",
      value: report?.unsubscribed_count ?? 0,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Marketing", href: ROUTES.dashboard.marketing },
          { label: data.campaign.name },
        ]}
        title={data.campaign.name}
        description="Build the email, preview it and send it to a contact segment."
      />

      <CampaignEditor
        campaign={data.campaign}
        initialBlocks={data.blocks}
        segments={data.segments}
        properties={data.properties}
        companyName={context.organization.name}
        availableLocales={context.organization.enabled_languages}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Campaign report</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {reportStats.map((stat) => (
              <div key={stat.label} className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">
                  {stat.label}
                </dt>
                <dd className="text-lg font-semibold">{stat.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">
            Delivered, opened and clicked counts are populated by email
            provider webhooks.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
