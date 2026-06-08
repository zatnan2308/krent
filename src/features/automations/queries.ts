import { createAdminClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

/** Строка списка флоу автоматизаций. */
export interface AutomationFlowListItem {
  id: string;
  name: string;
  description: string | null;
  triggerEvent: string | null;
  isActive: boolean;
  stepCount: number;
  updatedAt: string;
}

/** Список флоу организации с числом шагов. */
export async function listAutomationFlows(
  organizationId: string,
): Promise<AutomationFlowListItem[]> {
  const admin = createAdminClient();
  const { data: flows } = await admin
    .from("automation_flows")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  const rows = flows ?? [];
  if (rows.length === 0) {
    return [];
  }
  const ids = rows.map((flow) => flow.id);
  const { data: steps } = await admin
    .from("automation_steps")
    .select("automation_flow_id")
    .in("automation_flow_id", ids);
  const counts = new Map<string, number>();
  for (const step of steps ?? []) {
    counts.set(
      step.automation_flow_id,
      (counts.get(step.automation_flow_id) ?? 0) + 1,
    );
  }
  return rows.map((flow) => ({
    id: flow.id,
    name: flow.name,
    description: flow.description,
    triggerEvent: flow.trigger_event,
    isActive: flow.is_active,
    stepCount: counts.get(flow.id) ?? 0,
    updatedAt: flow.updated_at,
  }));
}

/** Шаг флоу для редактора. */
export interface AutomationStepItem {
  id: string;
  stepType: string;
  config: Record<string, unknown>;
  sortOrder: number;
}

export interface AutomationFlowDetail {
  flow: Tables<"automation_flows">;
  steps: AutomationStepItem[];
}

/** Флоу со связанными шагами (для редактора). */
export async function getAutomationFlow(
  organizationId: string,
  flowId: string,
): Promise<AutomationFlowDetail | null> {
  const admin = createAdminClient();
  const { data: flow } = await admin
    .from("automation_flows")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", flowId)
    .maybeSingle();
  if (!flow) {
    return null;
  }
  const { data: steps } = await admin
    .from("automation_steps")
    .select("*")
    .eq("automation_flow_id", flowId)
    .order("sort_order", { ascending: true });
  return {
    flow,
    steps: (steps ?? []).map((step) => ({
      id: step.id,
      stepType: step.step_type,
      config: (step.config ?? {}) as unknown as Record<string, unknown>,
      sortOrder: step.sort_order,
    })),
  };
}
