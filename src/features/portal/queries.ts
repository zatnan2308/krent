import type { User } from "@supabase/supabase-js";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/server/auth";
import type { Tables } from "@/types/database";

import type { PortalAccount, PortalAccountStatus, PortalType } from "./types";

/** Резолвнутый портальный аккаунт с контактом и организацией. */
export interface ResolvedPortalAccount {
  user: User;
  account: PortalAccount;
  contact: Tables<"contacts">;
  organization: Tables<"organizations">;
}

/**
 * Находит активный портальный аккаунт текущего пользователя по типу.
 * Сам аккаунт читается под RLS (видна только своя строка); контакт и
 * организация подтягиваются сервис-клиентом по уже доверенным id.
 */
export async function getPortalAccount(
  portalType: PortalType,
): Promise<ResolvedPortalAccount | null> {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const supabase = createClient();
  const { data: account } = await supabase
    .from("portal_accounts")
    .select("*")
    .eq("user_id", user.id)
    .eq("portal_type", portalType)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!account) {
    return null;
  }

  const admin = createAdminClient();
  const [contactResult, organizationResult] = await Promise.all([
    admin
      .from("contacts")
      .select("*")
      .eq("id", account.contact_id)
      .maybeSingle(),
    admin
      .from("organizations")
      .select("*")
      .eq("id", account.organization_id)
      .maybeSingle(),
  ]);
  if (!contactResult.data || !organizationResult.data) {
    return null;
  }

  return {
    user,
    account,
    contact: contactResult.data,
    organization: organizationResult.data,
  };
}

/** Типы порталов, к которым у текущего пользователя есть активный доступ. */
export async function listUserPortals(): Promise<PortalType[]> {
  const user = await getCurrentUser();
  if (!user) {
    return [];
  }
  const supabase = createClient();
  const { data } = await supabase
    .from("portal_accounts")
    .select("portal_type")
    .eq("user_id", user.id)
    .eq("status", "active");
  return [...new Set((data ?? []).map((row) => row.portal_type))];
}

// ---- Данные портала покупателя --------------------------------

export interface BuyerSavedProperty {
  favoriteId: string;
  propertyId: string;
  title: string;
  slug: string;
  status: string;
}

export interface BuyerSavedSearch {
  id: string;
  name: string;
  createdAt: string;
}

export interface BuyerLeadItem {
  id: string;
  type: string;
  status: string;
  source: string | null;
  propertyTitle: string | null;
  createdAt: string;
  scheduledAt: string | null;
}

export interface BuyerPortalData {
  savedProperties: BuyerSavedProperty[];
  savedSearches: BuyerSavedSearch[];
  leads: BuyerLeadItem[];
}

/** Данные портала покупателя: избранное, сохранённые поиски, обращения. */
export async function getBuyerPortalData(
  account: PortalAccount,
): Promise<BuyerPortalData> {
  const admin = createAdminClient();
  const [favoritesResult, searchesResult, leadsResult] = await Promise.all([
    admin
      .from("favorite_properties")
      .select("*")
      .eq("organization_id", account.organization_id)
      .eq("contact_id", account.contact_id)
      .order("created_at", { ascending: false }),
    admin
      .from("saved_searches")
      .select("*")
      .eq("organization_id", account.organization_id)
      .eq("contact_id", account.contact_id)
      .order("created_at", { ascending: false }),
    admin
      .from("leads")
      .select("*")
      .eq("organization_id", account.organization_id)
      .eq("contact_id", account.contact_id)
      .order("created_at", { ascending: false }),
  ]);

  const favorites = favoritesResult.data ?? [];
  const searches = searchesResult.data ?? [];
  const leads = leadsResult.data ?? [];

  const propertyIds = [
    ...new Set([
      ...favorites.map((favorite) => favorite.property_id),
      ...leads
        .map((lead) => lead.property_id)
        .filter((id): id is string => id !== null),
    ]),
  ];
  let properties: {
    id: string;
    title: string;
    slug: string;
    status: string;
  }[] = [];
  if (propertyIds.length > 0) {
    const { data } = await admin
      .from("properties")
      .select("id, title, slug, status")
      .in("id", propertyIds);
    properties = data ?? [];
  }

  return {
    savedProperties: favorites.map((favorite) => {
      const property = properties.find(
        (item) => item.id === favorite.property_id,
      );
      return {
        favoriteId: favorite.id,
        propertyId: favorite.property_id,
        title: property?.title ?? "Property",
        slug: property?.slug ?? "",
        status: property?.status ?? "",
      };
    }),
    savedSearches: searches.map((search) => ({
      id: search.id,
      name: search.name,
      createdAt: search.created_at,
    })),
    leads: leads.map((lead) => ({
      id: lead.id,
      type: lead.type,
      status: lead.status,
      source: lead.source,
      propertyTitle: lead.property_id
        ? (properties.find((item) => item.id === lead.property_id)?.title ??
          null)
        : null,
      createdAt: lead.created_at,
      scheduledAt: lead.scheduled_at,
    })),
  };
}

// ---- Данные портала продавца ----------------------------------

export interface SellerProperty {
  id: string;
  title: string;
  slug: string;
  status: string;
  purpose: string;
}

export interface SellerLeadItem {
  id: string;
  type: string;
  status: string;
  source: string | null;
  propertyTitle: string;
  createdAt: string;
}

/** Активность по объекту продавца: просмотры за 30 дней и число обращений. */
export interface SellerActivityItem {
  propertyId: string;
  title: string;
  views30d: number;
  inquiries: number;
}

export interface SellerPortalData {
  properties: SellerProperty[];
  inquiries: SellerLeadItem[];
  activity: SellerActivityItem[];
  reports: {
    totalViews30d: number;
    totalInquiries: number;
    totalShowings: number;
  };
}

/** Данные портала продавца: его объекты и обращения по ним. */
export async function getSellerPortalData(
  account: PortalAccount,
): Promise<SellerPortalData> {
  const admin = createAdminClient();
  const { data: propertyRows } = await admin
    .from("properties")
    .select("id, title, slug, status, purpose")
    .eq("organization_id", account.organization_id)
    .eq("seller_contact_id", account.contact_id)
    .order("created_at", { ascending: false });
  const properties = propertyRows ?? [];
  const propertyIds = properties.map((property) => property.id);

  let inquiries: SellerLeadItem[] = [];
  const inquiriesByProperty = new Map<string, number>();
  const viewsByProperty = new Map<string, number>();
  let totalShowings = 0;
  if (propertyIds.length > 0) {
    const since = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const [leadsResult, viewsResult] = await Promise.all([
      admin
        .from("leads")
        .select("*")
        .eq("organization_id", account.organization_id)
        .in("property_id", propertyIds)
        .order("created_at", { ascending: false }),
      admin
        .from("analytics_events")
        .select("entity_id")
        .eq("organization_id", account.organization_id)
        .eq("event_type", "property_view")
        .in("entity_id", propertyIds)
        .gte("occurred_at", since),
    ]);
    const leadRows = leadsResult.data ?? [];
    inquiries = leadRows.map((lead) => ({
      id: lead.id,
      type: lead.type,
      status: lead.status,
      source: lead.source,
      propertyTitle:
        properties.find((item) => item.id === lead.property_id)?.title ??
        "Property",
      createdAt: lead.created_at,
    }));
    for (const lead of leadRows) {
      if (lead.property_id) {
        inquiriesByProperty.set(
          lead.property_id,
          (inquiriesByProperty.get(lead.property_id) ?? 0) + 1,
        );
      }
      if (lead.source === "showing_request") totalShowings += 1;
    }
    for (const row of viewsResult.data ?? []) {
      if (row.entity_id) {
        viewsByProperty.set(
          row.entity_id,
          (viewsByProperty.get(row.entity_id) ?? 0) + 1,
        );
      }
    }
  }

  const activity: SellerActivityItem[] = properties.map((property) => ({
    propertyId: property.id,
    title: property.title,
    views30d: viewsByProperty.get(property.id) ?? 0,
    inquiries: inquiriesByProperty.get(property.id) ?? 0,
  }));
  let totalViews30d = 0;
  for (const count of viewsByProperty.values()) {
    totalViews30d += count;
  }

  return {
    properties: properties.map((property) => ({
      id: property.id,
      title: property.title,
      slug: property.slug,
      status: property.status,
      purpose: property.purpose,
    })),
    inquiries,
    activity,
    reports: {
      totalViews30d,
      totalInquiries: inquiries.length,
      totalShowings,
    },
  };
}

// ---- Данные портала гостя -------------------------------------

export interface GuestBooking {
  id: string;
  reference: string;
  propertyTitle: string;
  propertySlug: string | null;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  total: number;
  currency: string;
  status: string;
  paymentStatus: string;
}

export interface GuestPortalData {
  bookings: GuestBooking[];
}

/** Данные портала гостя: его бронирования по контакту. */
export async function getGuestPortalData(
  account: PortalAccount,
): Promise<GuestPortalData> {
  const admin = createAdminClient();
  const { data: bookingRows } = await admin
    .from("rental_bookings")
    .select("*")
    .eq("organization_id", account.organization_id)
    .eq("guest_contact_id", account.contact_id)
    .order("check_in", { ascending: false });
  const bookings = bookingRows ?? [];

  const propertyIds = [...new Set(bookings.map((row) => row.property_id))];
  const properties = new Map<string, { title: string; slug: string }>();
  if (propertyIds.length > 0) {
    const { data: propertyRows } = await admin
      .from("properties")
      .select("id, title, slug")
      .in("id", propertyIds);
    for (const property of propertyRows ?? []) {
      properties.set(property.id, {
        title: property.title,
        slug: property.slug,
      });
    }
  }

  return {
    bookings: bookings.map((row) => ({
      id: row.id,
      reference: row.reference,
      propertyTitle: properties.get(row.property_id)?.title ?? "Property",
      propertySlug: properties.get(row.property_id)?.slug ?? null,
      checkIn: row.check_in,
      checkOut: row.check_out,
      nights: row.nights,
      guests: row.adults + row.children,
      total: row.total,
      currency: row.currency,
      status: row.status,
      paymentStatus: row.payment_status,
    })),
  };
}

// ---- Документы клиентов ---------------------------------------

export interface ClientDocumentItem {
  id: string;
  fileName: string;
  sizeBytes: number | null;
  mimeType: string | null;
  createdAt: string;
  portalVisible: boolean;
}

function mapDocument(row: Tables<"client_documents">): ClientDocumentItem {
  return {
    id: row.id,
    fileName: row.file_name,
    sizeBytes: row.size_bytes,
    mimeType: row.mime_type,
    createdAt: row.created_at,
    portalVisible: row.portal_visible,
  };
}

/** Все документы контакта (для CRM-карточки агента). */
export async function listContactDocuments(
  organizationId: string,
  contactId: string,
): Promise<ClientDocumentItem[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("client_documents")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false });
  return (data ?? []).map(mapDocument);
}

/** Видимые в портале документы аккаунта (buyer/seller/guest). */
export async function listPortalDocuments(
  account: PortalAccount,
): Promise<ClientDocumentItem[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("client_documents")
    .select("*")
    .eq("organization_id", account.organization_id)
    .eq("contact_id", account.contact_id)
    .eq("portal_visible", true)
    .order("created_at", { ascending: false });
  return (data ?? []).map(mapDocument);
}

// ---- Управление аккаунтами в дашборде -------------------------

export interface PortalAccountListItem {
  id: string;
  contactName: string;
  email: string;
  portalType: PortalType;
  status: PortalAccountStatus;
  inviteToken: string | null;
  createdAt: string;
}

/** Список портальных аккаунтов организации для дашборда. */
export async function listPortalAccounts(
  organizationId: string,
): Promise<PortalAccountListItem[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("portal_accounts")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  const rows = data ?? [];
  if (rows.length === 0) {
    return [];
  }

  const contactIds = [...new Set(rows.map((row) => row.contact_id))];
  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, full_name")
    .in("id", contactIds);
  const contactList = contacts ?? [];

  return rows.map((row) => ({
    id: row.id,
    contactName:
      contactList.find((item) => item.id === row.contact_id)?.full_name ??
      "Unknown contact",
    email: row.email,
    portalType: row.portal_type,
    status: row.status,
    inviteToken: row.invite_token,
    createdAt: row.created_at,
  }));
}
