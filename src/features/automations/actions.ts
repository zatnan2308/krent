"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/server";
import { logAudit } from "@/server/audit";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

import { AUTOMATION_STEP_TYPES, AUTOMATION_TRIGGERS } from "./constants";

const ROOT = "/dashboard/marketing/automations";

type Result = { ok: true } | { ok: false; error: string };
type CreateResult = { ok: true; id: string } | { ok: false; error: string };

const NO_ORG = "No active organization.";
const NO_PERM = "You do not have permission to manage automations.";

/** Общая проверка: организация + право marketing.manage. */
async function authorize(): Promise<
  | { ok: true; organizationId: string; userId: string }
  | { ok: false; error: string }
> {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false, error: NO_ORG };
  }
  if (!hasPermission(context, "marketing.manage")) {
    return { ok: false, error: NO_PERM };
  }
  return {
    ok: true,
    organizationId: context.organization.id,
    userId: context.user.id,
  };
}

const createFlowSchema = z.object({
  name: z.string().trim().min(1).max(150),
  triggerEvent: z.enum(AUTOMATION_TRIGGERS),
  description: z.string().trim().max(500).nullable(),
});

/** Создаёт флоу (неактивный по умолчанию). */
export async function createAutomationFlow(
  input: z.infer<typeof createFlowSchema>,
): Promise<CreateResult> {
  const parsed = createFlowSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the form." };
  }
  const auth = await authorize();
  if (!auth.ok) {
    return auth;
  }
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("automation_flows")
    .insert({
      organization_id: auth.organizationId,
      name: parsed.data.name,
      description: parsed.data.description,
      trigger_event: parsed.data.triggerEvent,
      is_active: false,
    })
    .select("id")
    .single();
  if (error || !data) {
    return { ok: false, error: "Could not create the flow." };
  }
  await logAudit({
    organizationId: auth.organizationId,
    userId: auth.userId,
    action: "automation.flow_created",
    entityType: "automation_flow",
    entityId: data.id,
    metadata: { name: parsed.data.name },
  });
  revalidatePath(ROOT);
  return { ok: true, id: data.id };
}

const updateFlowSchema = z.object({
  flowId: z.guid(),
  name: z.string().trim().min(1).max(150),
  triggerEvent: z.enum(AUTOMATION_TRIGGERS),
  description: z.string().trim().max(500).nullable(),
});

/** Обновляет метаданные флоу (имя/триггер/описание). */
export async function updateAutomationFlow(
  input: z.infer<typeof updateFlowSchema>,
): Promise<Result> {
  const parsed = updateFlowSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the form." };
  }
  const auth = await authorize();
  if (!auth.ok) {
    return auth;
  }
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("automation_flows")
    .update({
      name: parsed.data.name,
      trigger_event: parsed.data.triggerEvent,
      description: parsed.data.description,
    })
    .eq("id", parsed.data.flowId)
    .eq("organization_id", auth.organizationId)
    .select("id");
  if (error) {
    return { ok: false, error: "Could not update the flow." };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "Flow not found." };
  }
  revalidatePath(ROOT);
  revalidatePath(`${ROOT}/${parsed.data.flowId}`);
  return { ok: true };
}

/** Включает/выключает флоу. */
export async function setAutomationFlowActive(
  flowId: string,
  isActive: boolean,
): Promise<Result> {
  const auth = await authorize();
  if (!auth.ok) {
    return auth;
  }
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("automation_flows")
    .update({ is_active: isActive })
    .eq("id", flowId)
    .eq("organization_id", auth.organizationId)
    .select("id");
  if (error || !data || data.length === 0) {
    return { ok: false, error: "Could not update the flow." };
  }
  revalidatePath(ROOT);
  revalidatePath(`${ROOT}/${flowId}`);
  return { ok: true };
}

/** Удаляет флоу (шаги и run'ы каскадно удаляются по FK). */
export async function deleteAutomationFlow(flowId: string): Promise<Result> {
  const auth = await authorize();
  if (!auth.ok) {
    return auth;
  }
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("automation_flows")
    .delete()
    .eq("id", flowId)
    .eq("organization_id", auth.organizationId)
    .select("id");
  if (error || !data || data.length === 0) {
    return { ok: false, error: "Could not delete the flow." };
  }
  await logAudit({
    organizationId: auth.organizationId,
    userId: auth.userId,
    action: "automation.flow_deleted",
    entityType: "automation_flow",
    entityId: flowId,
    metadata: {},
  });
  revalidatePath(ROOT);
  return { ok: true };
}

/** Добавляет шаг в конец флоу (с дефолтным config по типу). */
export async function addAutomationStep(
  flowId: string,
  stepType: (typeof AUTOMATION_STEP_TYPES)[number],
): Promise<Result> {
  if (!(AUTOMATION_STEP_TYPES as readonly string[]).includes(stepType)) {
    return { ok: false, error: "Unknown step type." };
  }
  const auth = await authorize();
  if (!auth.ok) {
    return auth;
  }
  const admin = createAdminClient();
  // Флоу должен принадлежать организации.
  const { data: flow } = await admin
    .from("automation_flows")
    .select("id")
    .eq("id", flowId)
    .eq("organization_id", auth.organizationId)
    .maybeSingle();
  if (!flow) {
    return { ok: false, error: "Flow not found." };
  }
  const { data: last } = await admin
    .from("automation_steps")
    .select("sort_order")
    .eq("automation_flow_id", flowId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (last?.sort_order ?? -1) + 1;
  const config =
    stepType === "delay" ? { minutes: 60 } : { subject: "", body: "" };
  const { error } = await admin.from("automation_steps").insert({
    organization_id: auth.organizationId,
    automation_flow_id: flowId,
    sort_order: nextOrder,
    step_type: stepType,
    config,
  });
  if (error) {
    return { ok: false, error: "Could not add the step." };
  }
  revalidatePath(`${ROOT}/${flowId}`);
  return { ok: true };
}

const updateStepSchema = z.object({
  stepId: z.guid(),
  minutes: z.coerce.number().min(0).max(100000).optional(),
  subject: z.string().trim().max(300).optional(),
  body: z.string().trim().max(20000).optional(),
});

/** Обновляет config шага (по его типу). */
export async function updateAutomationStep(
  input: z.infer<typeof updateStepSchema>,
): Promise<Result> {
  const parsed = updateStepSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the step." };
  }
  const auth = await authorize();
  if (!auth.ok) {
    return auth;
  }
  const admin = createAdminClient();
  const { data: step } = await admin
    .from("automation_steps")
    .select("id, step_type, automation_flow_id")
    .eq("id", parsed.data.stepId)
    .eq("organization_id", auth.organizationId)
    .maybeSingle();
  if (!step) {
    return { ok: false, error: "Step not found." };
  }
  const config =
    step.step_type === "delay"
      ? { minutes: Math.round(parsed.data.minutes ?? 0) }
      : { subject: parsed.data.subject ?? "", body: parsed.data.body ?? "" };
  const { error } = await admin
    .from("automation_steps")
    .update({ config })
    .eq("id", parsed.data.stepId)
    .eq("organization_id", auth.organizationId);
  if (error) {
    return { ok: false, error: "Could not save the step." };
  }
  revalidatePath(`${ROOT}/${step.automation_flow_id}`);
  return { ok: true };
}

/** Удаляет шаг. */
export async function deleteAutomationStep(stepId: string): Promise<Result> {
  const auth = await authorize();
  if (!auth.ok) {
    return auth;
  }
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("automation_steps")
    .delete()
    .eq("id", stepId)
    .eq("organization_id", auth.organizationId)
    .select("automation_flow_id");
  if (error || !data || data.length === 0) {
    return { ok: false, error: "Could not delete the step." };
  }
  revalidatePath(`${ROOT}/${data[0]?.automation_flow_id ?? ""}`);
  return { ok: true };
}
