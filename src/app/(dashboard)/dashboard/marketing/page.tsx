import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createCampaignAction } from "@/features/campaigns/actions";
import {
  CAMPAIGN_STATUS_BADGE,
  CAMPAIGN_STATUS_LABELS,
} from "@/features/campaigns/constants";
import { MarketingNav } from "@/features/campaigns/marketing-nav";
import { listCampaigns } from "@/features/campaigns/queries";
import { provisionSystemSegments } from "@/features/campaigns/segments";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ROUTES } from "@/lib/constants/routes";
import { getServerDictionary } from "@/lib/i18n/runtime";
import { createAdminClient } from "@/lib/supabase/server";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

export const metadata: Metadata = {
  title: "Marketing campaigns",
};

export default async function MarketingPage() {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return null;
  }
  if (!hasPermission(context, "marketing.manage")) {
    redirect(ROUTES.dashboard.root);
  }

  await provisionSystemSegments(context.organization.id);
  const campaigns = await listCampaigns(context.organization.id);

  const admin = createAdminClient();
  const { data: templates } = await admin
    .from("campaign_templates")
    .select("id, name, description")
    .is("organization_id", null)
    .order("name", { ascending: true });
  const dict = await getServerDictionary();
  const t = dict.dashMarketing;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.title}
        description={t.description}
      />
      <MarketingNav />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.startCampaign}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {(templates ?? []).map((template) => (
            <form key={template.id} action={createCampaignAction}>
              <input
                type="hidden"
                name="templateId"
                value={template.id}
              />
              <button
                type="submit"
                className={buttonVariants({ variant: "outline" })}
              >
                {t.newTemplate.replace("{name}", template.name)}
              </button>
            </form>
          ))}
          <form action={createCampaignAction}>
            <button type="submit" className={buttonVariants({})}>
              {t.blankCampaign}
            </button>
          </form>
        </CardContent>
      </Card>

      {campaigns.length > 0 ? (
        <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.colCampaign}</TableHead>
                <TableHead>{t.colSegment}</TableHead>
                <TableHead>{t.colStatus}</TableHead>
                <TableHead>{t.colSent}</TableHead>
                <TableHead>{t.colCreated}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`${ROUTES.dashboard.marketing}/campaigns/${campaign.id}`}
                      className="hover:underline"
                    >
                      {campaign.name}
                    </Link>
                    {campaign.subject ? (
                      <p className="text-xs text-muted-foreground">
                        {campaign.subject}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {campaign.segmentName ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={CAMPAIGN_STATUS_BADGE[campaign.status]}>
                      {CAMPAIGN_STATUS_LABELS[campaign.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {campaign.sentCount}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(campaign.createdAt).toLocaleDateString(
                      "en-US",
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState title={t.emptyTitle} description={t.emptyDesc} />
      )}
    </div>
  );
}
