import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CrmNav } from "@/features/crm/crm-nav";
import { getOrgAgents, listTasks } from "@/features/crm/queries";
import { TaskManager } from "@/features/crm/task-manager";
import { PageHeader } from "@/components/ui/page-header";
import { ROUTES } from "@/lib/constants/routes";
import { getServerDictionary } from "@/lib/i18n/runtime";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

export const metadata: Metadata = {
  title: "Tasks",
};

export default async function CrmTasksPage() {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return null;
  }
  if (!hasPermission(context, "crm.view")) {
    redirect(ROUTES.dashboard.root);
  }

  const [tasks, agents] = await Promise.all([
    listTasks(context.organization.id),
    getOrgAgents(context.organization.id),
  ]);
  const canManage = hasPermission(context, "crm.manage");
  const dict = await getServerDictionary();
  const t = dict.dashCrm;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.navTasks}
        description={t.tasksDesc}
      />
      <CrmNav />
      <TaskManager
        tasks={tasks}
        canManage={canManage}
        agents={agents}
        showRelations
      />
    </div>
  );
}
