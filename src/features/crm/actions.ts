"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { enqueueDealConversion } from "@/features/integrations/offline-conversions";
import { createAdminClient, createClient } from "@/lib/supabase/server";
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

/** Пишет активность по заметке/задаче на таймлайн связанной сущности
 *  (getEntityActivity фильтрует по entity_id). */
async function logCrmTargetActivity(
  organizationId: string,
  userId: string,
  action: string,
  target: CrmTarget,
): Promise<void> {
  const entityId = target.leadId ?? target.contactId ?? target.dealId;
  if (!entityId) return;
  await logAudit({
    organizationId,
    userId,
    action,
    entityType: target.leadId ? "lead" : target.contactId ? "contact" : "deal",
    entityId,
  });
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

const reassignLeadSchema = z.object({
  leadId: z.guid(),
  agentId: z.guid().nullable(),
});

/** (Ре)назначает лид агенту организации; null — снять. Только crm.manage_all. */
export async function reassignLead(
  input: z.infer<typeof reassignLeadSchema>,
): Promise<ActionResult> {
  const parsed = reassignLeadSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid agent." };
  }
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false, error: "No active organization." };
  }
  if (!hasPermission(context, "crm.manage_all")) {
    return { ok: false, error: "Only managers can reassign leads." };
  }
  const supabase = createClient();
  const { leadId, agentId } = parsed.data;
  const { data, error } = await supabase
    .from("leads")
    .update({ assigned_agent_id: agentId })
    .eq("id", leadId)
    .eq("organization_id", context.organization.id)
    .select("id");
  if (error) {
    return { ok: false, error: "Could not reassign the lead." };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "Lead not found or not editable." };
  }
  await logAudit({
    organizationId: context.organization.id,
    userId: context.user.id,
    action: agentId ? "lead.assigned" : "lead.unassigned",
    entityType: "lead",
    entityId: leadId,
    ...(agentId ? { metadata: { agentId } } : {}),
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

  // Закрытие сделки → ставим оффлайн-конверсию (best-effort, идемпотентно).
  if (status === "won") {
    try {
      await enqueueDealConversion(
        createAdminClient(),
        context.organization.id,
        dealId,
      );
    } catch {
      // Не критично для смены стадии.
    }
  }

  revalidatePath(CRM_DEALS);
  revalidatePath(`${CRM_DEALS}/${dealId}`);
  return { ok: true };
}

const createDealSchema = z.object({
  contactId: z.guid(),
  title: z.string().trim().min(1).max(200),
  amount: z.coerce.number().min(0).nullable(),
  stageId: z.guid().nullable(),
});
export type CreateDealInput = z.infer<typeof createDealSchema>;

/** Результат создания сделки — с id для перехода на карточку. */
export type CreateDealResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

/** Создаёт сделку вручную по контакту (стадия по умолчанию — системная «new»). */
export async function createDeal(
  input: CreateDealInput,
): Promise<CreateDealResult> {
  const parsed = createDealSchema.safeParse(input);
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
  const organizationId = context.organization.id;
  const d = parsed.data;
  const supabase = createClient();

  // Контакт должен принадлежать организации.
  const { data: contact } = await supabase
    .from("contacts")
    .select("id")
    .eq("id", d.contactId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (!contact) {
    return { ok: false, error: "Contact not found." };
  }

  // Стадия: выбранная (проверяем доступность) либо системная «new».
  let stageId = d.stageId;
  let status: "open" | "won" | "lost" = "open";
  if (stageId) {
    const { data: stage } = await supabase
      .from("deal_stages")
      .select("is_won, is_lost")
      .eq("id", stageId)
      .or(`organization_id.is.null,organization_id.eq.${organizationId}`)
      .maybeSingle();
    if (!stage) {
      return { ok: false, error: "Stage not found." };
    }
    status = stage.is_won ? "won" : stage.is_lost ? "lost" : "open";
  } else {
    const { data: defaultStage } = await supabase
      .from("deal_stages")
      .select("id")
      .is("organization_id", null)
      .eq("key", "new")
      .maybeSingle();
    stageId = defaultStage?.id ?? null;
  }

  const { data: deal, error } = await supabase
    .from("deals")
    .insert({
      organization_id: organizationId,
      assigned_agent_id: context.user.id,
      contact_id: d.contactId,
      lead_id: null,
      property_id: null,
      stage_id: stageId,
      title: d.title,
      amount: d.amount,
      currency: context.organization.default_currency,
      status,
    })
    .select("id")
    .single();
  if (error || !deal) {
    return { ok: false, error: "Could not create the deal." };
  }

  await logAudit({
    organizationId,
    userId: context.user.id,
    action: "deal.created",
    entityType: "deal",
    entityId: deal.id,
    metadata: { title: d.title, manual: true },
  });
  revalidatePath(CRM_DEALS);
  return { ok: true, id: deal.id };
}

/** Удаляет лид (manager-only). Сделка по лиду сохраняется (lead_id → null). */
export async function deleteLead(leadId: string): Promise<ActionResult> {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false, error: "No active organization." };
  }
  if (!hasPermission(context, "crm.manage_all")) {
    return { ok: false, error: "Only managers can delete leads." };
  }
  const supabase = createClient();
  const { data: deleted, error } = await supabase
    .from("leads")
    .delete()
    .eq("id", leadId)
    .eq("organization_id", context.organization.id)
    .select("id");
  if (error) {
    return { ok: false, error: "Could not delete the lead." };
  }
  if (!deleted || deleted.length === 0) {
    return { ok: false, error: "Lead not found or not deletable." };
  }
  await logAudit({
    organizationId: context.organization.id,
    userId: context.user.id,
    action: "lead.deleted",
    entityType: "lead",
    entityId: leadId,
    metadata: {},
  });
  revalidatePath(CRM_LEADS);
  return { ok: true };
}

/** Удаляет сделку (manager-only). Задачи/заметки сделки каскадно удаляются. */
export async function deleteDeal(dealId: string): Promise<ActionResult> {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false, error: "No active organization." };
  }
  if (!hasPermission(context, "crm.manage_all")) {
    return { ok: false, error: "Only managers can delete deals." };
  }
  const supabase = createClient();
  const { data: deleted, error } = await supabase
    .from("deals")
    .delete()
    .eq("id", dealId)
    .eq("organization_id", context.organization.id)
    .select("id");
  if (error) {
    return { ok: false, error: "Could not delete the deal." };
  }
  if (!deleted || deleted.length === 0) {
    return { ok: false, error: "Deal not found or not deletable." };
  }
  await logAudit({
    organizationId: context.organization.id,
    userId: context.user.id,
    action: "deal.deleted",
    entityType: "deal",
    entityId: dealId,
    metadata: {},
  });
  revalidatePath(CRM_DEALS);
  return { ok: true };
}

/**
 * Удаляет контакт (manager-only). Связанные записи каскадят/обнуляются по FK
 * (лиды/сделки/задачи/заметки/переписки — cascade; брони — set null).
 */
export async function deleteContact(contactId: string): Promise<ActionResult> {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false, error: "No active organization." };
  }
  if (!hasPermission(context, "crm.manage_all")) {
    return { ok: false, error: "Only managers can delete contacts." };
  }
  const supabase = createClient();
  const { data: deleted, error } = await supabase
    .from("contacts")
    .delete()
    .eq("id", contactId)
    .eq("organization_id", context.organization.id)
    .select("id");
  if (error) {
    return { ok: false, error: "Could not delete the contact." };
  }
  if (!deleted || deleted.length === 0) {
    return { ok: false, error: "Contact not found or not deletable." };
  }
  await logAudit({
    organizationId: context.organization.id,
    userId: context.user.id,
    action: "contact.deleted",
    entityType: "contact",
    entityId: contactId,
    metadata: {},
  });
  revalidatePath(CRM_CONTACTS);
  return { ok: true };
}

const setLeadAppointmentSchema = z.object({
  leadId: z.guid(),
  scheduledAt: z.string().trim().min(1).nullable(),
});
export type SetLeadAppointmentInput = z.infer<typeof setLeadAppointmentSchema>;

/** Назначает/снимает время показа по лиду (раздел Appointments портала покупателя). */
export async function setLeadAppointment(
  input: SetLeadAppointmentInput,
): Promise<ActionResult> {
  const parsed = setLeadAppointmentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the appointment date." };
  }
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false, error: "No active organization." };
  }
  if (!hasPermission(context, "crm.manage")) {
    return { ok: false, error: "You do not have permission to manage leads." };
  }
  const { leadId, scheduledAt } = parsed.data;
  let iso: string | null = null;
  if (scheduledAt) {
    // datetime-local — «настенное» время; трактуем как локаль браузера → UTC.
    const when = new Date(scheduledAt);
    if (Number.isNaN(when.getTime())) {
      return { ok: false, error: "Please enter a valid date and time." };
    }
    iso = when.toISOString();
  }
  const supabase = createClient();
  const { data, error } = await supabase
    .from("leads")
    .update({ scheduled_at: iso })
    .eq("id", leadId)
    .eq("organization_id", context.organization.id)
    .select("id");
  if (error) {
    return { ok: false, error: "Could not update the appointment." };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "Lead not found or not editable." };
  }
  await logAudit({
    organizationId: context.organization.id,
    userId: context.user.id,
    action: "lead.appointment_set",
    entityType: "lead",
    entityId: leadId,
    metadata: { scheduled_at: iso },
  });
  revalidatePath(`${CRM_LEADS}/${leadId}`);
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

  // Если сделка переведена в выигранную стадию — ставим оффлайн-конверсию.
  if (updatePayload.status === "won") {
    try {
      await enqueueDealConversion(
        createAdminClient(),
        context.organization.id,
        d.dealId,
      );
    } catch {
      // Не критично для сохранения сделки.
    }
  }

  revalidatePath(CRM_DEALS);
  revalidatePath(`${CRM_DEALS}/${d.dealId}`);
  return { ok: true };
}

const CONTACT_KINDS = ["person", "company"] as const;
const updateContactSchema = z.object({
  contactId: z.guid(),
  fullName: z.string().trim().min(1).max(200),
  email: z.string().trim().max(200).nullable(),
  phone: z.string().trim().max(50).nullable(),
  preferredLanguage: z.string().trim().max(10).nullable(),
  preferredCurrency: z.string().trim().max(10).nullable(),
  // Блок A — идентификация и контакты.
  contactKind: z.enum(CONTACT_KINDS),
  companyName: z.string().trim().max(200).nullable(),
  jobTitle: z.string().trim().max(150).nullable(),
  secondaryPhone: z.string().trim().max(50).nullable(),
  secondaryEmail: z.string().trim().max(200).nullable(),
  preferredChannel: z.string().trim().max(20).nullable(),
  bestTimeToContact: z.string().trim().max(20).nullable(),
  addressLine: z.string().trim().max(300).nullable(),
  city: z.string().trim().max(120).nullable(),
  postalCode: z.string().trim().max(30).nullable(),
  country: z.string().trim().max(120).nullable(),
  dateOfBirth: z.string().trim().max(20).nullable(),
  referredByContactId: z.guid().nullable(),
  referralNote: z.string().trim().max(500).nullable(),
});
export type UpdateContactInput = z.infer<typeof updateContactSchema>;

/** Обновляет данные контакта (имя/email/телефон/язык/валюта). */
export async function updateContact(
  input: UpdateContactInput,
): Promise<ActionResult> {
  const parsed = updateContactSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the contact form." };
  }
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false, error: "No active organization." };
  }
  if (!hasPermission(context, "crm.manage")) {
    return { ok: false, error: "You do not have permission to edit contacts." };
  }
  const supabase = createClient();
  const d = parsed.data;
  // Контакт не может «привести» сам себя.
  const referredBy =
    d.referredByContactId && d.referredByContactId !== d.contactId
      ? d.referredByContactId
      : null;
  const { data, error } = await supabase
    .from("contacts")
    .update({
      full_name: d.fullName,
      email: d.email,
      phone: d.phone,
      preferred_language: d.preferredLanguage,
      preferred_currency: d.preferredCurrency,
      contact_kind: d.contactKind,
      company_name: d.companyName,
      job_title: d.jobTitle,
      secondary_phone: d.secondaryPhone,
      secondary_email: d.secondaryEmail,
      preferred_channel: d.preferredChannel,
      best_time_to_contact: d.bestTimeToContact,
      address_line: d.addressLine,
      city: d.city,
      postal_code: d.postalCode,
      country: d.country,
      date_of_birth: d.dateOfBirth || null,
      referred_by_contact_id: referredBy,
      referral_note: d.referralNote,
    })
    .eq("id", d.contactId)
    .eq("organization_id", context.organization.id)
    .select("id");
  if (error) {
    return { ok: false, error: "Could not update the contact." };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "Contact not found or not editable." };
  }
  revalidatePath(`${CRM_CONTACTS}/${d.contactId}`);
  revalidatePath(CRM_CONTACTS);
  return { ok: true };
}

const RELATIONSHIP_TYPES = [
  "spouse",
  "partner",
  "co_buyer",
  "co_borrower",
  "family",
  "assistant",
  "other",
] as const;

const createRelationshipSchema = z.object({
  contactId: z.guid(),
  relatedContactId: z.guid().nullable(),
  relatedName: z.string().trim().max(200).nullable(),
  relationshipType: z.enum(RELATIONSHIP_TYPES),
});

/** Добавляет связанное лицо к контакту (супруг/со-покупатель и т.п.). */
export async function createContactRelationship(
  input: z.infer<typeof createRelationshipSchema>,
): Promise<ActionResult> {
  const parsed = createRelationshipSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the related person." };
  }
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false, error: "No active organization." };
  }
  if (!hasPermission(context, "crm.manage")) {
    return { ok: false, error: "You do not have permission to edit contacts." };
  }
  const d = parsed.data;
  if (!d.relatedContactId && !(d.relatedName && d.relatedName.length > 0)) {
    return { ok: false, error: "Pick a contact or enter a name." };
  }
  const supabase = createClient();
  const { error } = await supabase.from("contact_relationships").insert({
    organization_id: context.organization.id,
    contact_id: d.contactId,
    related_contact_id: d.relatedContactId,
    related_name: d.relatedName,
    relationship_type: d.relationshipType,
  });
  if (error) {
    return { ok: false, error: "Could not add the related person." };
  }
  revalidatePath(`${CRM_CONTACTS}/${d.contactId}`);
  return { ok: true };
}

/** Удаляет связанное лицо. */
export async function deleteContactRelationship(
  relationshipId: string,
): Promise<ActionResult> {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false, error: "No active organization." };
  }
  if (!hasPermission(context, "crm.manage")) {
    return { ok: false, error: "You do not have permission to edit contacts." };
  }
  const supabase = createClient();
  const { data, error } = await supabase
    .from("contact_relationships")
    .delete()
    .eq("id", relationshipId)
    .eq("organization_id", context.organization.id)
    .select("contact_id");
  if (error) {
    return { ok: false, error: "Could not remove the related person." };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "Related person not found." };
  }
  revalidatePath(`${CRM_CONTACTS}/${data[0]?.contact_id ?? ""}`);
  return { ok: true };
}

const CONTACT_ROLES = [
  "buyer",
  "seller",
  "renter",
  "landlord",
  "investor",
  "other",
] as const;
const LIFECYCLE_STAGES = [
  "new",
  "nurture",
  "active",
  "under_contract",
  "past_client",
  "sphere",
] as const;
const TEMPERATURES = ["hot", "warm", "cold"] as const;
const PRIORITIES = ["low", "medium", "high"] as const;

const updateClassificationSchema = z.object({
  contactId: z.guid(),
  role: z.enum(CONTACT_ROLES).nullable(),
  lifecycleStage: z.enum(LIFECYCLE_STAGES),
  temperature: z.enum(TEMPERATURES).nullable(),
  leadScore: z.number().int().min(0).max(100).nullable(),
  priority: z.enum(PRIORITIES).nullable(),
  tags: z.array(z.string().trim().min(1).max(40)).max(30),
});

/** Обновляет классификацию контакта (роль/стадия/температура/скор/приоритет/теги). */
export async function updateContactClassification(
  input: z.infer<typeof updateClassificationSchema>,
): Promise<ActionResult> {
  const parsed = updateClassificationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the form." };
  }
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false, error: "No active organization." };
  }
  if (!hasPermission(context, "crm.manage")) {
    return { ok: false, error: "You do not have permission to edit contacts." };
  }
  const d = parsed.data;
  const tags = [...new Set(d.tags.map((tag) => tag.trim()).filter(Boolean))];
  const supabase = createClient();
  const { data, error } = await supabase
    .from("contacts")
    .update({
      role: d.role,
      lifecycle_stage: d.lifecycleStage,
      temperature: d.temperature,
      lead_score: d.leadScore,
      priority: d.priority,
      tags,
    })
    .eq("id", d.contactId)
    .eq("organization_id", context.organization.id)
    .select("id");
  if (error) {
    return { ok: false, error: "Could not update the contact." };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "Contact not found or not editable." };
  }
  revalidatePath(`${CRM_CONTACTS}/${d.contactId}`);
  revalidatePath(CRM_CONTACTS);
  return { ok: true };
}

const VERIFICATION_STATUSES = ["none", "pending", "verified"] as const;
const updateProcessSchema = z.object({
  contactId: z.guid(),
  lastContactedAt: z.string().trim().nullable(),
  nextFollowUpAt: z.string().trim().nullable(),
  verificationStatus: z.enum(VERIFICATION_STATUSES),
  isVip: z.boolean(),
  internalNotes: z.string().trim().max(4000).nullable(),
});

/** datetime-local → ISO (или null). Браузер трактует значение как локаль. */
function toIsoOrNull(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Обновляет служебные поля контакта (блок G). */
export async function updateContactProcess(
  input: z.infer<typeof updateProcessSchema>,
): Promise<ActionResult> {
  const parsed = updateProcessSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the form." };
  }
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false, error: "No active organization." };
  }
  if (!hasPermission(context, "crm.manage")) {
    return { ok: false, error: "You do not have permission to edit contacts." };
  }
  const d = parsed.data;
  const supabase = createClient();
  const { data, error } = await supabase
    .from("contacts")
    .update({
      last_contacted_at: toIsoOrNull(d.lastContactedAt),
      next_follow_up_at: toIsoOrNull(d.nextFollowUpAt),
      verification_status: d.verificationStatus,
      is_vip: d.isVip,
      internal_notes: d.internalNotes,
    })
    .eq("id", d.contactId)
    .eq("organization_id", context.organization.id)
    .select("id");
  if (error) {
    return { ok: false, error: "Could not update the contact." };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "Contact not found or not editable." };
  }
  revalidatePath(`${CRM_CONTACTS}/${d.contactId}`);
  return { ok: true };
}

const updateConsentsSchema = z.object({
  contactId: z.guid(),
  consentCall: z.boolean(),
  consentSms: z.boolean(),
  consentEmail: z.boolean(),
  consentWhatsapp: z.boolean(),
  consentMarketing: z.boolean(),
  doNotContact: z.boolean(),
  consentSource: z.string().trim().max(200).nullable(),
});

/** Обновляет согласия контакта на связь (блок F). */
export async function updateContactConsents(
  input: z.infer<typeof updateConsentsSchema>,
): Promise<ActionResult> {
  const parsed = updateConsentsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the form." };
  }
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false, error: "No active organization." };
  }
  if (!hasPermission(context, "crm.manage")) {
    return { ok: false, error: "You do not have permission to edit contacts." };
  }
  const d = parsed.data;
  const anyConsent =
    d.consentCall ||
    d.consentSms ||
    d.consentEmail ||
    d.consentWhatsapp ||
    d.consentMarketing;
  const supabase = createClient();
  const { data, error } = await supabase
    .from("contacts")
    .update({
      consent_call: d.consentCall,
      consent_sms: d.consentSms,
      consent_email: d.consentEmail,
      consent_whatsapp: d.consentWhatsapp,
      consent_marketing: d.consentMarketing,
      do_not_contact: d.doNotContact,
      consent_source: d.consentSource,
      consent_at: anyConsent ? new Date().toISOString() : null,
    })
    .eq("id", d.contactId)
    .eq("organization_id", context.organization.id)
    .select("id");
  if (error) {
    return { ok: false, error: "Could not update the contact." };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "Contact not found or not editable." };
  }
  revalidatePath(`${CRM_CONTACTS}/${d.contactId}`);
  return { ok: true };
}

const createContactSchema = z.object({
  fullName: z.string().trim().min(1).max(200),
  email: z
    .string()
    .trim()
    .max(200)
    .nullable()
    .transform((value) => (value ? value.toLowerCase() : null)),
  phone: z.string().trim().max(50).nullable(),
});
export type CreateContactInput = z.input<typeof createContactSchema>;

/** Результат создания контакта — с id для перехода на карточку. */
export type CreateContactResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

/** Создаёт контакт вручную (org-scoped, дедуп по email). */
export async function createContact(
  input: CreateContactInput,
): Promise<CreateContactResult> {
  const parsed = createContactSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the contact form." };
  }
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false, error: "No active organization." };
  }
  if (!hasPermission(context, "crm.manage")) {
    return { ok: false, error: "You do not have permission to add contacts." };
  }
  const organizationId = context.organization.id;
  const d = parsed.data;
  const email = d.email && d.email.length > 0 ? d.email : null;
  const supabase = createClient();

  // Дедуп по email (unique-индекс по lower(email)) — сообщаем явно.
  if (email) {
    const { data: existing } = await supabase
      .from("contacts")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("email", email)
      .maybeSingle();
    if (existing) {
      return { ok: false, error: "A contact with this email already exists." };
    }
  }

  const { data: created, error } = await supabase
    .from("contacts")
    .insert({
      organization_id: organizationId,
      full_name: d.fullName,
      email,
      phone: d.phone,
    })
    .select("id")
    .single();
  if (error || !created) {
    return { ok: false, error: "Could not create the contact." };
  }

  await logAudit({
    organizationId,
    userId: context.user.id,
    action: "contact.created",
    entityType: "contact",
    entityId: created.id,
    metadata: { full_name: d.fullName },
  });
  revalidatePath(CRM_CONTACTS);
  return { ok: true, id: created.id };
}

export interface MergeTargetOption {
  id: string;
  name: string;
  detail: string | null;
}

/** Поиск кандидатов для слияния (имя/email/телефон), кроме исключённого. */
export async function searchContactsForMerge(input: {
  query: string;
  excludeId: string;
}): Promise<MergeTargetOption[]> {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return [];
  }
  if (!hasPermission(context, "crm.manage_all")) {
    return [];
  }
  const term = input.query.trim().replace(/[,()%]/g, " ");
  if (term.length < 2) {
    return [];
  }
  const supabase = createClient();
  const { data } = await supabase
    .from("contacts")
    .select("id, full_name, email, phone")
    .eq("organization_id", context.organization.id)
    .neq("id", input.excludeId)
    .or(`full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`)
    .order("full_name", { ascending: true })
    .limit(10);
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.full_name,
    detail: row.email ?? row.phone ?? null,
  }));
}

/**
 * Сливает дубликат-контакт (secondary) в основной (primary): атомарно
 * переносит все ссылки и удаляет secondary (RPC `merge_contacts`).
 * Деструктивно — только обладатель `crm.manage_all`.
 */
export async function mergeContact(input: {
  primaryId: string;
  secondaryId: string;
}): Promise<ActionResult> {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false, error: "No active organization." };
  }
  if (!hasPermission(context, "crm.manage_all")) {
    return { ok: false, error: "Only managers can merge contacts." };
  }
  if (input.primaryId === input.secondaryId) {
    return { ok: false, error: "Pick a different contact to merge into." };
  }
  const organizationId = context.organization.id;
  const admin = createAdminClient();

  // Обе записи должны существовать в этой организации.
  const { data: both } = await admin
    .from("contacts")
    .select("id")
    .eq("organization_id", organizationId)
    .in("id", [input.primaryId, input.secondaryId]);
  if (!both || both.length !== 2) {
    return { ok: false, error: "Both contacts must exist in your organization." };
  }

  const { error } = await admin.rpc("merge_contacts", {
    p_primary: input.primaryId,
    p_secondary: input.secondaryId,
    p_org: organizationId,
  });
  if (error) {
    return { ok: false, error: "Could not merge the contacts." };
  }

  await logAudit({
    organizationId,
    userId: context.user.id,
    action: "contact.merged",
    entityType: "contact",
    entityId: input.primaryId,
    metadata: { merged_from: input.secondaryId },
  });
  revalidatePath(CRM_CONTACTS);
  revalidatePath(`${CRM_CONTACTS}/${input.primaryId}`);
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

  await logCrmTargetActivity(
    context.organization.id,
    context.user.id,
    "note.created",
    data,
  );
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
    const target: CrmTarget = {
      leadId: note.lead_id,
      contactId: note.contact_id,
      dealId: note.deal_id,
    };
    await logCrmTargetActivity(
      context.organization.id,
      context.user.id,
      "note.deleted",
      target,
    );
    revalidateForTarget(target);
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

  await logCrmTargetActivity(
    context.organization.id,
    context.user.id,
    "task.created",
    data,
  );
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
    .select("id, lead_id, contact_id, deal_id");
  if (error) {
    return { ok: false, error: "Could not update the task." };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "Task not found or not editable." };
  }

  const row = data[0];
  const target: CrmTarget = {
    leadId: row?.lead_id ?? null,
    contactId: row?.contact_id ?? null,
    dealId: row?.deal_id ?? null,
  };
  await logCrmTargetActivity(
    context.organization.id,
    context.user.id,
    "task.status_changed",
    target,
  );
  revalidatePath(CRM_TASKS);
  revalidatePath(CRM_ROOT);
  revalidateForTarget(target);
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
  const { data: task } = await supabase
    .from("tasks")
    .select("lead_id, contact_id, deal_id")
    .eq("id", taskId)
    .eq("organization_id", context.organization.id)
    .maybeSingle();
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId)
    .eq("organization_id", context.organization.id);
  if (error) {
    return { ok: false, error: "Could not delete the task." };
  }

  if (task) {
    const target: CrmTarget = {
      leadId: task.lead_id,
      contactId: task.contact_id,
      dealId: task.deal_id,
    };
    await logCrmTargetActivity(
      context.organization.id,
      context.user.id,
      "task.deleted",
      target,
    );
    revalidateForTarget(target);
  }
  revalidatePath(CRM_TASKS);
  return { ok: true };
}
