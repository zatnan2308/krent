"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/server/audit";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

import {
  createNoteSchema,
  createTaskSchema,
  leadStatusSchema,
  taskStatusSchema,
  type ActionResult,
  type CreateNoteInput,
  type CreateTaskInput,
} from "./schema";

const CRM_ROOT = "/dashboard/crm";
const CRM_LEADS = "/dashboard/crm/leads";
const CRM_DEALS = "/dashboard/crm/deals";
const CRM_TASKS = "/dashboard/crm/tasks";
const CRM_CONTACTS = "/dashboard/crm/contacts";

interface CrmTarget {
  leadId: string | null;
  contactId: string | null;
  dealId: string | null;
}

/** Перевалидирует страницу детали, к которой относится заметка/задача. */
function revalidateForTarget(target: CrmTarget): void {
  if (target.leadId) {
    revalidatePath(`${CRM_LEADS}/${target.leadId}`);
  }
  if (target.contactId) {
    revalidatePath(`${CRM_CONTACTS}/${target.contactId}`);
  }
  if (target.dealId) {
    revalidatePath(CRM_DEALS);
  }
}

/** Меняет статус лида. */
export async function setLeadStatus(
  leadId: string,
  status: string,
): Promise<ActionResult> {
  const parsedStatus = leadStatusSchema.safeParse(status);
  if (!parsedStatus.success) {
    return { ok: false, error: "Invalid status." };
  }
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false, error: "No active organization." };
  }
  if (!hasPermission(context, "crm.manage")) {
    return { ok: false, error: "You do not have permission to manage leads." };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("leads")
    .update({ status: parsedStatus.data })
    .eq("id", leadId)
    .eq("organization_id", context.organization.id)
    .select("id");
  if (error) {
    return { ok: false, error: "Could not update the lead." };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "Lead not found or not editable." };
  }

  await logAudit({
    organizationId: context.organization.id,
    userId: context.user.id,
    action: "lead.status_changed",
    entityType: "lead",
    entityId: leadId,
    metadata: { status: parsedStatus.data },
  });

  revalidatePath(CRM_LEADS);
  revalidatePath(`${CRM_LEADS}/${leadId}`);
  revalidatePath(CRM_ROOT);
  return { ok: true };
}

/** Назначает лид текущему пользователю. */
export async function assignLeadToSelf(leadId: string): Promise<ActionResult> {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false, error: "No active organization." };
  }
  if (!hasPermission(context, "crm.manage")) {
    return { ok: false, error: "You do not have permission to manage leads." };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("leads")
    .update({ assigned_agent_id: context.user.id })
    .eq("id", leadId)
    .eq("organization_id", context.organization.id)
    .select("id");
  if (error) {
    return { ok: false, error: "Could not assign the lead." };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "You cannot assign this lead." };
  }

  await logAudit({
    organizationId: context.organization.id,
    userId: context.user.id,
    action: "lead.assigned",
    entityType: "lead",
    entityId: leadId,
    metadata: { agentId: context.user.id },
  });

  revalidatePath(CRM_LEADS);
  revalidatePath(`${CRM_LEADS}/${leadId}`);
  return { ok: true };
}

/** Снимает назначение с лида (доступно обладателю crm.manage_all). */
export async function unassignLead(leadId: string): Promise<ActionResult> {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false, error: "No active organization." };
  }
  // Снять назначение может только обладатель crm.manage_all: RLS WITH CHECK на
  // leads разрешает писать assigned_agent_id лишь = себе или с manage_all, так
  // что установка null обычным агентом всё равно не пройдёт (0 строк).
  if (!hasPermission(context, "crm.manage_all")) {
    return { ok: false, error: "Only managers can unassign leads." };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("leads")
    .update({ assigned_agent_id: null })
    .eq("id", leadId)
    .eq("organization_id", context.organization.id)
    .select("id");
  if (error) {
    return { ok: false, error: "Could not update the lead." };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "You cannot unassign this lead." };
  }

  await logAudit({
    organizationId: context.organization.id,
    userId: context.user.id,
    action: "lead.unassigned",
    entityType: "lead",
    entityId: leadId,
  });

  revalidatePath(CRM_LEADS);
  revalidatePath(`${CRM_LEADS}/${leadId}`);
  return { ok: true };
}

/** Создаёт сделку из лида и помечает лид как converted. */
export async function convertLeadToDeal(
  leadId: string,
): Promise<ActionResult> {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false, error: "No active organization." };
  }
  if (!hasPermission(context, "crm.manage")) {
    return { ok: false, error: "You do not have permission to manage deals." };
  }

  const supabase = createClient();
  const organizationId = context.organization.id;

  const { data: lead } = await supabase
    .from("leads")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", leadId)
    .maybeSingle();
  if (!lead) {
    return { ok: false, error: "Lead not found." };
  }
  // Идемпотентность: не создаём второй deal при повторном клике «Convert».
  if (lead.status === "converted") {
    return {
      ok: false,
      error: "This lead has already been converted to a deal.",
    };
  }

  const [contactResult, stageResult] = await Promise.all([
    supabase
      .from("contacts")
      .select("full_name")
      .eq("id", lead.contact_id)
      .maybeSingle(),
    supabase
      .from("deal_stages")
      .select("id")
      .is("organization_id", null)
      .eq("key", "new")
      .maybeSingle(),
  ]);

  let propertyTitle: string | null = null;
  if (lead.property_id) {
    const { data: property } = await supabase
      .from("properties")
      .select("title")
      .eq("id", lead.property_id)
      .maybeSingle();
    propertyTitle = property?.title ?? null;
  }

  const contactName = contactResult.data?.full_name ?? "Lead";
  const title = propertyTitle
    ? `${contactName} — ${propertyTitle}`
    : `${contactName} — ${lead.type}`;

  const { data: deal, error: dealError } = await supabase
    .from("deals")
    .insert({
      organization_id: organizationId,
      assigned_agent_id: lead.assigned_agent_id ?? context.user.id,
      contact_id: lead.contact_id,
      lead_id: lead.id,
      property_id: lead.property_id,
      stage_id: stageResult.data?.id ?? null,
      title,
      amount: lead.budget_max,
      currency: lead.currency,
      status: "open",
    })
    .select("id")
    .single();
  if (dealError || !deal) {
    return { ok: false, error: "Could not create the deal." };
  }

  await supabase
    .from("leads")
    .update({ status: "converted" })
    .eq("id", leadId)
    .eq("organization_id", organizationId);

  await logAudit({
    organizationId,
    userId: context.user.id,
    action: "lead.converted",
    entityType: "lead",
    entityId: leadId,
    metadata: { dealId: deal.id },
  });
  await logAudit({
    organizationId,
    userId: context.user.id,
    action: "deal.created",
    entityType: "deal",
    entityId: deal.id,
    metadata: { leadId, title },
  });

  revalidatePath(CRM_LEADS);
  revalidatePath(`${CRM_LEADS}/${leadId}`);
  revalidatePath(CRM_DEALS);
  return { ok: true };
}

/** Перемещает сделку на другую стадию воронки. */
export async function moveDeal(
  dealId: string,
  stageId: string,
): Promise<ActionResult> {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false, error: "No active organization." };
  }
  if (!hasPermission(context, "crm.manage")) {
    return { ok: false, error: "You do not have permission to manage deals." };
  }

  const supabase = createClient();
  const { data: stage } = await supabase
    .from("deal_stages")
    .select("name, is_won, is_lost")
    .eq("id", stageId)
    .maybeSingle();
  if (!stage) {
    return { ok: false, error: "Stage not found." };
  }
  const status = stage.is_won ? "won" : stage.is_lost ? "lost" : "open";

  const { data, error } = await supabase
    .from("deals")
    .update({ stage_id: stageId, status })
    .eq("id", dealId)
    .eq("organization_id", context.organization.id)
    .select("id");
  if (error) {
    return { ok: false, error: "Could not move the deal." };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "You cannot edit this deal." };
  }

  await logAudit({
    organizationId: context.organization.id,
    userId: context.user.id,
    action: "deal.stage_changed",
    entityType: "deal",
    entityId: dealId,
    metadata: { stage: stage.name, status },
  });

  revalidatePath(CRM_DEALS);
  revalidatePath(`${CRM_DEALS}/${dealId}`);
  return { ok: true };
}

const updateDealSchema = z.object({
  dealId: z.guid(),
  title: z.string().trim().min(1).max(200),
  amount: z.coerce.number().min(0).nullable(),
  currency: z.string().trim().min(3).max(10),
  expectedCloseDate: z.string().trim().nullable(),
  stageId: z.guid().nullable(),
});
export type UpdateDealInput = z.infer<typeof updateDealSchema>;

/** Обновляет поля сделки (сумма/валюта/дата закрытия/стадия). */
export async function updateDeal(
  input: UpdateDealInput,
): Promise<ActionResult> {
  const parsed = updateDealSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the deal form." };
  }
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false, error: "No active organization." };
  }
  if (!hasPermission(context, "crm.manage")) {
    return { ok: false, error: "You do not have permission to manage deals." };
  }

  const supabase = createClient();
  const d = parsed.data;
  const updatePayload: {
    title: string;
    amount: number | null;
    currency: string;
    expected_close_date: string | null;
    stage_id: string | null;
    status?: "open" | "won" | "lost";
  } = {
    title: d.title,
    amount: d.amount,
    currency: d.currency,
    expected_close_date: d.expectedCloseDate || null,
    stage_id: d.stageId,
  };
  if (d.stageId) {
    const { data: stage } = await supabase
      .from("deal_stages")
      .select("is_won, is_lost")
      .eq("id", d.stageId)
      .maybeSingle();
    if (stage) {
      updatePayload.status = stage.is_won
        ? "won"
        : stage.is_lost
          ? "lost"
          : "open";
    }
  }

  const { data, error } = await supabase
    .from("deals")
    .update(updatePayload)
    .eq("id", d.dealId)
    .eq("organization_id", context.organization.id)
    .select("id");
  if (error) {
    return { ok: false, error: "Could not update the deal." };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "You cannot edit this deal." };
  }

  await logAudit({
    organizationId: context.organization.id,
    userId: context.user.id,
    action: "deal.updated",
    entityType: "deal",
    entityId: d.dealId,
    metadata: { title: d.title },
  });

  revalidatePath(CRM_DEALS);
  revalidatePath(`${CRM_DEALS}/${d.dealId}`);
  return { ok: true };
}

/** Добавляет заметку к лиду / контакту / сделке. */
export async function createNote(
  input: CreateNoteInput,
): Promise<ActionResult> {
  const parsed = createNoteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Note text is required." };
  }
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false, error: "No active organization." };
  }
  if (!hasPermission(context, "crm.manage")) {
    return { ok: false, error: "You do not have permission to add notes." };
  }

  const data = parsed.data;
  const supabase = createClient();
  const { error } = await supabase.from("notes").insert({
    organization_id: context.organization.id,
    author_id: context.user.id,
    contact_id: data.contactId,
    lead_id: data.leadId,
    deal_id: data.dealId,
    body: data.body,
  });
  if (error) {
    return { ok: false, error: "Could not save the note." };
  }

  revalidateForTarget(data);
  return { ok: true };
}

/** Удаляет заметку. */
export async function deleteNote(noteId: string): Promise<ActionResult> {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false, error: "No active organization." };
  }
  if (!hasPermission(context, "crm.manage")) {
    return { ok: false, error: "You do not have permission to manage notes." };
  }

  const supabase = createClient();
  const { data: note } = await supabase
    .from("notes")
    .select("lead_id, contact_id, deal_id")
    .eq("id", noteId)
    .eq("organization_id", context.organization.id)
    .maybeSingle();

  const { data: deleted, error } = await supabase
    .from("notes")
    .delete()
    .eq("id", noteId)
    .eq("organization_id", context.organization.id)
    .select("id");
  if (error) {
    return { ok: false, error: "Could not delete the note." };
  }
  // RLS разрешает удалять только свою заметку (или с manage_all): при блоке
  // delete не ошибается, но затрагивает 0 строк — сообщаем явно.
  if (!deleted || deleted.length === 0) {
    return { ok: false, error: "You can only delete your own notes." };
  }

  if (note) {
    revalidateForTarget({
      leadId: note.lead_id,
      contactId: note.contact_id,
      dealId: note.deal_id,
    });
  }
  return { ok: true };
}

/** Создаёт задачу (по умолчанию назначается создателю). */
export async function createTask(
  input: CreateTaskInput,
): Promise<ActionResult> {
  const parsed = createTaskSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Task title is required." };
  }
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false, error: "No active organization." };
  }
  if (!hasPermission(context, "crm.manage")) {
    return { ok: false, error: "You do not have permission to create tasks." };
  }

  const data = parsed.data;
  const dueDate =
    data.dueDate && data.dueDate.trim() !== "" ? data.dueDate : null;
  const supabase = createClient();
  const { error } = await supabase.from("tasks").insert({
    organization_id: context.organization.id,
    created_by: context.user.id,
    assigned_agent_id: data.assignedAgentId ?? context.user.id,
    contact_id: data.contactId,
    lead_id: data.leadId,
    deal_id: data.dealId,
    title: data.title,
    description: data.description,
    due_date: dueDate,
    priority: data.priority,
    status: "open",
  });
  if (error) {
    return { ok: false, error: "Could not create the task." };
  }

  revalidatePath(CRM_TASKS);
  revalidatePath(CRM_ROOT);
  revalidateForTarget(data);
  return { ok: true };
}

/** Меняет статус задачи (выполнена / открыта / отменена). */
export async function setTaskStatus(
  taskId: string,
  status: string,
): Promise<ActionResult> {
  const parsedStatus = taskStatusSchema.safeParse(status);
  if (!parsedStatus.success) {
    return { ok: false, error: "Invalid status." };
  }
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false, error: "No active organization." };
  }
  if (!hasPermission(context, "crm.manage")) {
    return { ok: false, error: "You do not have permission to manage tasks." };
  }

  const supabase = createClient();
  const completedAt =
    parsedStatus.data === "completed" ? new Date().toISOString() : null;
  const { data, error } = await supabase
    .from("tasks")
    .update({ status: parsedStatus.data, completed_at: completedAt })
    .eq("id", taskId)
    .eq("organization_id", context.organization.id)
    .select("id");
  if (error) {
    return { ok: false, error: "Could not update the task." };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "Task not found or not editable." };
  }

  revalidatePath(CRM_TASKS);
  revalidatePath(CRM_ROOT);
  return { ok: true };
}

/** Удаляет задачу. */
export async function deleteTask(taskId: string): Promise<ActionResult> {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false, error: "No active organization." };
  }
  if (!hasPermission(context, "crm.manage")) {
    return { ok: false, error: "You do not have permission to manage tasks." };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId)
    .eq("organization_id", context.organization.id);
  if (error) {
    return { ok: false, error: "Could not delete the task." };
  }

  revalidatePath(CRM_TASKS);
  return { ok: true };
}
