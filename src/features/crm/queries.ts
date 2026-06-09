import { createAdminClient, createClient } from "@/lib/supabase/server";
import { resolveUserNames } from "@/server/user-directory";
import type { Tables } from "@/types/database";

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
  authorId: string | null;
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
  role: string | null;
  lifecycleStage: string;
  temperature: string | null;
  tags: string[];
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
/** Размер страницы списков лидов/контактов в dashboard. */
export const LEADS_PAGE_SIZE = 20;
export const CONTACTS_PAGE_SIZE = 20;

/** Страница лидов с общим числом совпадений для пагинации. */
export interface LeadListResult {
  items: LeadListItem[];
  total: number;
  page: number;
  pageSize: number;
}

/** Обогащает строки лидов именами контакта/объекта/агента. */
async function enrichLeadRows(
  supabase: ReturnType<typeof createClient>,
  rows: Lead[],
): Promise<LeadListItem[]> {
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

export async function listLeads(
  organizationId: string,
  options: {
    status?: LeadStatus;
    type?: LeadListItem["type"];
    source?: string;
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
  if (options.source) {
    query = query.eq("source", options.source);
  }
  if (options.contactId) {
    query = query.eq("contact_id", options.contactId);
  }
  const ordered = query.order("created_at", { ascending: false });
  const { data } = await (options.limit
    ? ordered.limit(options.limit)
    : ordered);
  return enrichLeadRows(supabase, data ?? []);
}

/**
 * Страница лидов с фильтрами status/type/source и срезом `.range()`.
 * Возвращает общее число совпадений (`count: exact`) для пагинации.
 */
export async function listLeadsPage(
  organizationId: string,
  options: {
    status?: LeadStatus;
    type?: LeadListItem["type"];
    source?: string;
    page?: number;
    pageSize?: number;
  } = {},
): Promise<LeadListResult> {
  const supabase = createClient();
  const pageSize = options.pageSize ?? LEADS_PAGE_SIZE;
  const page = Math.max(1, options.page ?? 1);
  let query = supabase
    .from("leads")
    .select("*", { count: "exact" })
    .eq("organization_id", organizationId);
  if (options.status) {
    query = query.eq("status", options.status);
  }
  if (options.type) {
    query = query.eq("type", options.type);
  }
  if (options.source) {
    query = query.eq("source", options.source);
  }
  const from = (page - 1) * pageSize;
  const { data, count } = await query
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);
  const items = await enrichLeadRows(supabase, data ?? []);
  return { items, total: count ?? 0, page, pageSize };
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
    authorId: note.author_id,
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

/** Страница контактов с общим числом совпадений для пагинации. */
export interface ContactListResult {
  items: ContactListItem[];
  total: number;
  page: number;
  pageSize: number;
}

function mapContactRow(contact: Contact): ContactListItem {
  return {
    id: contact.id,
    fullName: contact.full_name,
    email: contact.email,
    phone: contact.phone,
    createdAt: contact.created_at,
    role: contact.role,
    lifecycleStage: contact.lifecycle_stage,
    temperature: contact.temperature,
    tags: contact.tags,
  };
}

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

  return (data ?? []).map(mapContactRow);
}

/** Страница контактов с поиском `q` и срезом `.range()` (+ count для пагинации). */
export async function listContactsPage(
  organizationId: string,
  filters: {
    q?: string;
    page?: number;
    pageSize?: number;
    role?: string;
    lifecycle?: string;
    temperature?: string;
    tag?: string;
  } = {},
): Promise<ContactListResult> {
  const supabase = createClient();
  const pageSize = filters.pageSize ?? CONTACTS_PAGE_SIZE;
  const page = Math.max(1, filters.page ?? 1);
  let query = supabase
    .from("contacts")
    .select("*", { count: "exact" })
    .eq("organization_id", organizationId);
  if (filters.q) {
    const term = filters.q.replace(/[,()]/g, " ");
    query = query.or(
      `full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`,
    );
  }
  if (filters.role) {
    query = query.eq("role", filters.role);
  }
  if (filters.lifecycle) {
    query = query.eq("lifecycle_stage", filters.lifecycle);
  }
  if (filters.temperature) {
    query = query.eq("temperature", filters.temperature);
  }
  if (filters.tag) {
    query = query.contains("tags", [filters.tag]);
  }
  const from = (page - 1) * pageSize;
  const { data, count } = await query
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);
  return {
    items: (data ?? []).map(mapContactRow),
    total: count ?? 0,
    page,
    pageSize,
  };
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

/** Лёгкий вариант контакта для выпадашек (создание сделки и т.п.). */
export interface ContactOption {
  id: string;
  name: string;
  email: string | null;
}

/** Список контактов организации для выбора в формах. */
export async function listContactOptions(
  organizationId: string,
): Promise<ContactOption[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("contacts")
    .select("id, full_name, email")
    .eq("organization_id", organizationId)
    .order("full_name", { ascending: true })
    .limit(1000);
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.full_name,
    email: row.email,
  }));
}

/** Связанное лицо контакта (с разрешённым отображаемым именем). */
export interface ContactRelationshipItem {
  id: string;
  relationshipType: string;
  relatedContactId: string | null;
  name: string;
}

/** Связанные лица контакта (супруг/со-покупатель и т.п.). */
export async function listContactRelationships(
  organizationId: string,
  contactId: string,
): Promise<ContactRelationshipItem[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("contact_relationships")
    .select("id, relationship_type, related_contact_id, related_name")
    .eq("organization_id", organizationId)
    .eq("contact_id", contactId)
    .order("created_at", { ascending: true });
  const rows = data ?? [];
  const ids = rows
    .map((row) => row.related_contact_id)
    .filter((id): id is string => id !== null);
  const names = new Map<string, string>();
  if (ids.length > 0) {
    const { data: contacts } = await supabase
      .from("contacts")
      .select("id, full_name")
      .eq("organization_id", organizationId)
      .in("id", ids);
    for (const contact of contacts ?? []) {
      names.set(contact.id, contact.full_name);
    }
  }
  return rows.map((row) => ({
    id: row.id,
    relationshipType: row.relationship_type,
    relatedContactId: row.related_contact_id,
    name: row.related_contact_id
      ? (names.get(row.related_contact_id) ?? row.related_name ?? "—")
      : (row.related_name ?? "—"),
  }));
}

/** Профиль покупателя (финансы + параметры поиска), 1:1 с контактом. */
export async function getContactBuyerProfile(
  organizationId: string,
  contactId: string,
): Promise<Tables<"contact_buyer_profiles"> | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("contact_buyer_profiles")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("contact_id", contactId)
    .maybeSingle();
  return data;
}

/** Профиль продавца (объект на продажу), 1:1 с контактом. */
export async function getContactSellerProfile(
  organizationId: string,
  contactId: string,
): Promise<Tables<"contact_seller_profiles"> | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("contact_seller_profiles")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("contact_id", contactId)
    .maybeSingle();
  return data;
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

/** Активные участники организации — для назначения задач. */
export async function getOrgAgents(
  organizationId: string,
): Promise<{ id: string; name: string }[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", organizationId)
    .eq("status", "active");
  const ids = [...new Set((data ?? []).map((member) => member.user_id))];
  if (ids.length === 0) {
    return [];
  }
  const names = await resolveUserNames(ids);
  return ids.map((id) => ({ id, name: names.get(id) ?? "Agent" }));
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

// ---- Activity timeline ----------------------------------------

/** Одна запись ленты активности (из audit_logs). */
export interface ActivityItem {
  id: string;
  action: string;
  actorName: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

/**
 * Лента активности по сущностям CRM из audit_logs. Фильтр строго по
 * `entity_id` (UUID глобально уникален, так что чужие/чувствительные
 * записи аудита не зацепятся) — поэтому читаем сервис-клиентом и показываем
 * владельцам `crm.view`, не требуя отдельного `audit.view`.
 *
 * Для лида/сделки передаётся один id; для контакта — id контакта вместе
 * с id его лидов и сделок (агрегированная лента).
 */
export async function getEntityActivity(
  organizationId: string,
  entityIds: string[],
  limit = 50,
): Promise<ActivityItem[]> {
  const ids = [...new Set(entityIds.filter(Boolean))];
  if (ids.length === 0) {
    return [];
  }
  const admin = createAdminClient();
  const { data } = await admin
    .from("audit_logs")
    .select("id, action, user_id, metadata, created_at")
    .eq("organization_id", organizationId)
    .in("entity_id", ids)
    .order("created_at", { ascending: false })
    .limit(limit);
  const rows = data ?? [];

  const names = await resolveUserNames(
    rows
      .map((row) => row.user_id)
      .filter((value): value is string => Boolean(value)),
  );

  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    actorName: row.user_id ? (names.get(row.user_id) ?? null) : null,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    createdAt: row.created_at,
  }));
}

// ---- Lead sources ---------------------------------------------

/** Справочник источника лида. */
export interface LeadSourceItem {
  key: string;
  name: string;
}

/**
 * Источники лидов: системные (`organization_id is null`) плюс кастомные
 * источники организации. При совпадении ключа приоритет у кастомного.
 */
export async function listLeadSources(
  organizationId: string,
): Promise<LeadSourceItem[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("lead_sources")
    .select("key, name, organization_id, sort_order")
    .or(`organization_id.is.null,organization_id.eq.${organizationId}`)
    .order("sort_order", { ascending: true });

  const byKey = new Map<string, LeadSourceItem>();
  for (const row of data ?? []) {
    // Кастомный (с organization_id) перекрывает системный с тем же ключом.
    if (row.organization_id || !byKey.has(row.key)) {
      byKey.set(row.key, { key: row.key, name: row.name });
    }
  }
  return [...byKey.values()];
}

/** Строка разбивки лидов по источнику. */
export interface LeadSourceCount {
  key: string;
  name: string;
  count: number;
}

/**
 * Разбивка лидов организации по источнику с человекочитаемыми именами из
 * lead_sources. Источник без записи в справочнике (или пустой) попадает в
 * «Unknown». Отсортировано по убыванию количества.
 */
export async function getLeadSourceBreakdown(
  organizationId: string,
): Promise<LeadSourceCount[]> {
  const supabase = createClient();
  const [leadResult, sources] = await Promise.all([
    supabase
      .from("leads")
      .select("source")
      .eq("organization_id", organizationId),
    listLeadSources(organizationId),
  ]);
  const nameByKey = new Map(sources.map((item) => [item.key, item.name]));

  const counts = new Map<string, number>();
  for (const row of leadResult.data ?? []) {
    const key = row.source ?? "unknown";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([key, count]) => ({
      key,
      name: nameByKey.get(key) ?? (key === "unknown" ? "Unknown" : key),
      count,
    }))
    .sort((a, b) => b.count - a.count);
}
