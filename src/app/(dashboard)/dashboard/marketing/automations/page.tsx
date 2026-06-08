import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AutomationCreateForm } from "@/features/automations/automation-create-form";
import { AutomationListControls } from "@/features/automations/automation-list-controls";
import {
  AUTOMATION_TRIGGER_LABELS,
  isAutomationTrigger,
} from "@/features/automations/constants";
import { listAutomationFlows } from "@/features/automations/queries";
import { MarketingNav } from "@/features/campaigns/marketing-nav";
import { Badge } from "@/components/ui/badge";
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
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

export const metadata: Metadata = {
  title: "Automations",
};

export const dynamic = "force-dynamic";

function triggerLabel(value: string | null): string {
  if (value && isAutomationTrigger(value)) {
    return AUTOMATION_TRIGGER_LABELS[value];
  }
  return value ?? "—";
}

export default async function AutomationsPage() {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return null;
  }
  if (!hasPermission(context, "marketing.manage")) {
    redirect(ROUTES.dashboard.root);
  }

  const flows = await listAutomationFlows(context.organization.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Automations"
        description="Trigger-based flows that follow up on new leads and bookings."
      />
      <MarketingNav />
      <AutomationCreateForm />

      {flows.length > 0 ? (
        <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Steps</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flows.map((flow) => (
                <TableRow key={flow.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`${ROUTES.dashboard.marketingAutomations}/${flow.id}`}
                      className="hover:underline"
                    >
                      {flow.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {triggerLabel(flow.triggerEvent)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {flow.stepCount}
                  </TableCell>
                  <TableCell>
                    {flow.isActive ? (
                      <Badge variant="secondary">Active</Badge>
                    ) : (
                      <Badge variant="outline">Off</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <AutomationListControls
                      flowId={flow.id}
                      isActive={flow.isActive}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState
          title="No automations yet"
          description="Create a flow to automatically follow up on new leads."
        />
      )}
    </div>
  );
}
