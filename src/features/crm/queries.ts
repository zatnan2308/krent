import { createClient } from "@/lib/supabase/server";
import { resolveUserNames } from "@/server/user-directory";

import type {
  Contact,
  DealStage,
  DealStatus,
  Lead,
  LeadAttribution,
  LeadStatus,
  LeadType,
  TaskPriority,
  TaskStatus,
} from "./types";

// ---- Типы представлений ---------------------------------------

export interface LeadListItem {
  id: string;
  contactName: string;
  contactEmail: string | null;
  type: LeadType;
  status: LeadStatus;
  source: string | null;
  propertyTitle: string | null;
  agentName: string | null;
  message: string | null;
  createdAt: string;
}

export interface LeadDetail {
  lead: Lead;
  contact: Contact | null;
  attribution: LeadAttribution | null;
  propertyTitle: string | null;
  propertySlug: string | null;
  agentName: string | null;
}

export interface NoteItem {
  id: string;
  body: string;
  authorName: string | null;
  createdAt: string;
}

export interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  agentName: string | null;
  leadId: string | null;
  contactId: string | null;
  dealId: string | null;
  createdAt: string;
}

export interface ContactListItem {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  createdAt: string;
}

export interface ContactDetail {
  contact: Contact;
  leads: LeadListItem[];
  deals: DealListItem[];
}

export interface DealListItem {
  id: string;
  title: string;
  amount: number | null;
  currency: string | null;
  status: DealStatus;
  stageId: string | null;
  stageName: string | null;
  contactName: string;
  propertyTitle: string | null;
  agentName: string | null;
  createdAt: string;
}

export interface CrmOverview {
  newLeads: number;
  totalLeads: number;
  openDeals: number;
  openTasks: number;
  recentLeads: LeadListItem[];
}

function notNull(value: string | null): value is string {
  return value !== null;
}

// ---- Лиды -----------------------------------------------------

/** Список лидов организации. RLS ограничивает выборку правами агента. */
export async function listLeads(
  organizationId: string,
  options: {
    status?: LeadStatus;
    type?: LeadListItem["type"];
    contactId?: string;
    limit?: number;
  } = {},
): Promise<LeadListItem[]> {
  const supabase = createClient();
  let query = supabase
    .from("leads")
    .select("*")
    .eq("organization_id", organizationId);
  if (options.status) {
    query = query.eq("status", options.status);
  }
  if (options.type) {
    query = query.eq("type", options.type);
  }
  if (options.contactId) {
    query = query.eq("contact_id", options.contactId);
  }
  const ordered = query.order("created_at", { ascending: false });
  const { data } = await (options.limit
    ? ordered.limit(options.limit)
    : ordered);
  const rows = data ?? [];
  if (rows.length === 0) {
    return [];
  }

  const contactIds = [...new Set(rows.map((row) => row.contact_id))];
  const propertyIds = [
    ...new Set(rows.map((row) => row.property_id).filter(notNull)),
  ];
  const [contactsResult, propertiesResult] = await Promise.all([
    supabase.from("contacts").select("id, full_name, email").in("id", contactIds),
    supabase.from("properties").select("id, title").in("id", propertyIds),
  ]);
  const contacts = contactsResult.data ?? [];
  const properties = propertiesResult.data ?? [];
  const agentNames = await resolveUserNames(
    rows.map((row) => row.assigned_agent_id).filter(notNull),
  );

  return rows.map((lead) => {
    const contact = contacts.find((item) => item.id === lead.contact_id);
    const property = lead.property_id
      ? properties.find((item) => item.id === lead.property_id)
      : undefined;
    return {
      id: lead.id,
      contactName: contact?.full_name ?? "Unknown contact",
      contactEmail: contact?.email ?? null,
      type: lead.type,
      status: lead.status,
      source: lead.source,
      propertyTitle: property?.title ?? null,
      agentName: lead.assigned_agent_id
        ? (agentNames.get(lead.assigned_agent_id) ?? null)
        : null,
      message: lead.message,
      createdAt: lead.created_at,
    };
  });
}

/** Полные данные лида для страницы детали. */
export async function getLead(
  organizationId: string,
  leadId: string,
): Promise<LeadDetail | null> {
  const supabase = createClient();
  const { data: lead } = await supabase
    .from("leads")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", leadId)
    .maybeSingle();
  if (!lead) {
    return null;
  }

  const [contactResult, attributionResult] = await Promise.all([
    supabase.from("contacts").select("*").eq("id", lead.contact_id).maybeSingle(),
    supabase
      .from("lead_attribution")
      .select("*")
      .eq("lead_id", lead.id)
      .maybeSingle(),
  ]);

  let propertyTitle: string | null = null;
  let propertySlug: string | null = null;
  if (lead.property_id) {
    const { data: property } = await supabase
      .from("properties")
      .select("title, slug")
      .eq("id", lead.property_id)
      .maybeSingle();
    if (property) {
      propertyTitle = property.title;
      propertySlug = property.slug;
    }
  }

  const agentNames = await resolveUserNames(
    lead.assigned_agent_id ? [lead.assigned_agent_id] : [],
  );

  return {
    lead,
    contact: contactResult.data,
    attribution: attributionResult.data,
    propertyTitle,
    propertySlug,
    agentName: lead.assigned_agent_id
      ? (agentNames.get(lead.assigned_agent_id) ?? null)
      : null,
  };
}

// ---- Заметки --------------------------------------------------

/** Заметки по лиду / контакту / сделке. */
export async function listNotes(
  organizationId: string,
  target: { leadId?: string; contactId?: string; dealId?: string },
): Promise<NoteItem[]> {
  const supabase = createClient();
  let query = supabase
    .from("notes")
    .select("*")
    .eq("organization_id", organizationId);
  if (target.leadId) {
    query = query.eq("lead_id", target.leadId);
  }
  if (target.contactId) {
    query = query.eq("contact_id", target.contactId);
  }
  if (target.dealId) {
    query = query.eq("deal_id", target.dealId);
  }

  const { data } = await query.order("created_at", { ascending: false });
  const rows = data ?? [];
  const authorNames = await resolveUserNames(
    rows.map((row) => row.author_id).filter(notNull),
  );

  return rows.map((note) => ({
    id: note.id,
    body: note.body,
    authorName: note.author_id
      ? (authorNames.get(note.author_id) ?? null)
      : null,
    createdAt: note.created_at,
  }));
}

// ---- Задачи ---------------------------------------------------

/** Список задач организации. */
export async function listTasks(
  organizationId: string,
  options: {
    leadId?: string;
    contactId?: string;
    dealId?: string;
    limit?: number;
  } = {},
): Promise<TaskItem[]> {
  const supabase = createClient();
  let query = supabase
    .from("tasks")
    .select("*")
    .eq("organization_id", organizationId);
  if (options.leadId) {
    query = query.eq("lead_id", options.leadId);
  }
  if (options.contactId) {
    query = query.eq("contact_id", options.contactId);
  }
  if (options.dealId) {
    query = query.eq("deal_id", options.dealId);
  }
  const ordered = query
    .order("status", { ascending: true })
    .order("created_at", { ascending: false });
  const { data } = await (options.limit
    ? ordered.limit(options.limit)
    : ordered);
  const rows = data ?? [];
  const agentNames = await resolveUserNames(
    rows.map((row) => row.assigned_agent_id).filter(notNull),
  );

  return rows.map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDate: task.due_date,
    agentName: task.assigned_agent_id
      ? (agentNames.get(task.assigned_agent_id) ?? null)
      : null,
    leadId: task.lead_id,
    contactId: task.contact_id,
    dealId: task.deal_id,
    createdAt: task.created_at,
  }));
}

// ---- Контакты -------------------------------------------------

/** Список контактов организации. */
export async function listContacts(
  organizationId: string,
  filters: { q?: string } = {},
): Promise<ContactListItem[]> {
  const supabase = createClient();
  let query = supabase
    .from("contacts")
    .select("*")
    .eq("organization_id", organizationId);
  if (filters.q) {
    const term = filters.q.replace(/[,()]/g, " ");
    query = query.or(
      `full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`,
    );
  }
  const { data } = await query.order("created_at", { ascending: false });

  return (data ?? []).map((contact) => ({
    id: contact.id,
    fullName: contact.full_name,
    email: contact.email,
    phone: contact.phone,
    createdAt: contact.created_at,
  }));
}

/** Контакт с его лидами и сделками. */
export async function getContact(
  organizationId: string,
  contactId: string,
): Promise<ContactDetail | null> {
  const supabase = createClient();
  const { data: contact } = await supabase
    .from("contacts")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", contactId)
    .maybeSingle();
  if (!contact) {
    return null;
  }

  const [leads, deals] = await Promise.all([
    listLeads(organizationId, { contactId }),
    listDeals(organizationId, { contactId }),
  ]);

  return { contact, leads, deals };
}

// ---- Сделки ---------------------------------------------------

/** Стадии воронки: системные + кастомные организации. */
export async function getDealStages(
  organizationId: string,
): Promise<DealStage[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("deal_stages")
    .select("*")
    .or(`organization_id.is.null,organization_id.eq.${organizationId}`)
    .order("sort_order", { ascending: true });
  return data ?? [];
}

/** Список сделок организации. */
export async function listDeals(
  organizationId: string,
  options: { contactId?: string } = {},
): Promise<DealListItem[]> {
  const supabase = createClient();
  let query = supabase
    .from("deals")
    .select("*")
    .eq("organization_id", organizationId);
  if (options.contactId) {
    query = query.eq("contact_id", options.contactId);
  }

  const { data } = await query.order("created_at", { ascending: false });
  const rows = data ?? [];
  if (rows.length === 0) {
    return [];
  }

  const contactIds = [...new Set(rows.map((row) => row.contact_id))];
  const propertyIds = [
    ...new Set(rows.map((row) => row.property_id).filter(notNull)),
  ];
  const stageIds = [
    ...new Set(rows.map((row) => row.stage_id).filter(notNull)),
  ];
  const [contactsResult, propertiesResult, stagesResult] = await Promise.all([
    supabase.from("contacts").select("id, full_name").in("id", contactIds),
    supabase.from("properties").select("id, title").in("id", propertyIds),
    supabase.from("deal_stages").select("id, name").in("id", stageIds),
  ]);
  const contacts = contactsResult.data ?? [];
  const properties = propertiesResult.data ?? [];
  const stages = stagesResult.data ?? [];
  const agentNames = await resolveUserNames(
    rows.map((row) => row.assigned_agent_id).filter(notNull),
  );

  return rows.map((deal) => ({
    id: deal.id,
    title: deal.title,
    amount: deal.amount,
    currency: deal.currency,
    status: deal.status,
    stageId: deal.stage_id,
    stageName: deal.stage_id
      ? (stages.find((item) => item.id === deal.stage_id)?.name ?? null)
      : null,
    contactName:
      contacts.find((item) => item.id === deal.contact_id)?.full_name ??
      "Unknown contact",
    propertyTitle: deal.property_id
      ? (properties.find((item) => item.id === deal.property_id)?.title ?? null)
      : null,
    agentName: deal.assigned_agent_id
      ? (agentNames.get(deal.assigned_agent_id) ?? null)
      : null,
    createdAt: deal.created_at,
  }));
}

/** Детали одной сделки для страницы редактирования. */
export interface DealDetail {
  id: string;
  title: string;
  amount: number | null;
  currency: string;
  status: string;
  stageId: string | null;
  stageName: string | null;
  contactId: string;
  contactName: string;
  contactEmail: string | null;
  propertyTitle: string | null;
  agentName: string | null;
  expectedCloseDate: string | null;
  createdAt: string;
}

/** Сделка организации со связанными данными. */
export async function getDeal(
  organizationId: string,
  dealId: string,
): Promise<DealDetail | null> {
  const supabase = createClient();
  const { data: deal } = await supabase
    .from("deals")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", dealId)
    .maybeSingle();
  if (!deal) {
    return null;
  }

  const [contactRes, stageRes, propertyRes] = await Promise.all([
    supabase
      .from("contacts")
      .select("id, full_name, email")
      .eq("id", deal.contact_id)
      .maybeSingle(),
    deal.stage_id
      ? supabase
          .from("deal_stages")
          .select("name")
          .eq("id", deal.stage_id)
          .maybeSingle()
      : Promise.resolve({ data: null as { name: string } | null }),
    deal.property_id
      ? supabase
          .from("properties")
          .select("title")
          .eq("id", deal.property_id)
          .maybeSingle()
      : Promise.resolve({ data: null as { title: string } | null }),
  ]);
  const agentNames = deal.assigned_agent_id
    ? await resolveUserNames([deal.assigned_agent_id])
    : new Map<string, string>();

  return {
    id: deal.id,
    title: deal.title,
    amount: deal.amount,
    currency: deal.currency ?? "USD",
    status: deal.status,
    stageId: deal.stage_id,
    stageName: stageRes.data?.name ?? null,
    contactId: deal.contact_id,
    contactName: contactRes.data?.full_name ?? "Unknown contact",
    contactEmail: contactRes.data?.email ?? null,
    propertyTitle: propertyRes.data?.title ?? null,
    agentName: deal.assigned_agent_id
      ? (agentNames.get(deal.assigned_agent_id) ?? null)
      : null,
    expectedCloseDate: deal.expected_close_date,
    createdAt: deal.created_at,
  };
}

// ---- Сводка ---------------------------------------------------

/** Сводка для дашборда CRM: счётчики + недавние лиды. */
export async function getCrmOverview(
  organizationId: string,
): Promise<CrmOverview> {
  const supabase = createClient();
  const [newLeads, totalLeads, openDeals, openTasks, recentLeads] =
    await Promise.all([
      supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("status", "new"),
      supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId),
      supabase
        .from("deals")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("status", "open"),
      supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("status", "open"),
      listLeads(organizationId, { limit: 5 }),
    ]);

  return {
    newLeads: newLeads.count ?? 0,
    totalLeads: totalLeads.count ?? 0,
    openDeals: openDeals.count ?? 0,
    openTasks: openTasks.count ?? 0,
    recentLeads,
  };
}
