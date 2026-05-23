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

export interface SellerPortalData {
  properties: SellerProperty[];
  inquiries: SellerLeadItem[];
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
  if (propertyIds.length > 0) {
    const { data: leadRows } = await admin
      .from("leads")
      .select("*")
      .eq("organization_id", account.organization_id)
      .in("property_id", propertyIds)
      .order("created_at", { ascending: false });
    inquiries = (leadRows ?? []).map((lead) => ({
      id: lead.id,
      type: lead.type,
      status: lead.status,
      source: lead.source,
      propertyTitle:
        properties.find((item) => item.id === lead.property_id)?.title ??
        "Property",
      createdAt: lead.created_at,
    }));
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
  };
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
