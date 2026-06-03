import type { User } from "@supabase/supabase-js";

import {
  listMyConversations,
  type ConversationListItem,
} from "@/features/chat/queries";
import { DEFAULT_CURRENCY, isCurrencyCode } from "@/lib/currency/config";
import { formatCurrency, formatPrice } from "@/lib/currency/format";
import { createAdminClient, createClient } from "@/lib/supabase/server";

/** Статус поездки для UI кабинета. */
export type TripStatus = "upcoming" | "past" | "cancelled";

export interface AccountTrip {
  id: string;
  reference: string;
  propertyTitle: string;
  propertySlug: string | null;
  img: string | null;
  location: string | null;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  totalText: string;
  status: TripStatus;
  paid: boolean;
  createdAt: string;
}

export interface AccountPayment {
  id: string;
  date: string;
  description: string;
  amountText: string;
  method: string;
  status: string;
}

export interface AccountSaved {
  propertyId: string;
  title: string;
  slug: string;
  location: string | null;
  img: string | null;
  priceText: string | null;
}

export interface AccountProfile {
  name: string;
  email: string | null;
  phone: string | null;
  initials: string;
  memberSince: string | null;
}

export interface AccountData {
  /** Есть ли у пользователя клиентский (портальный) аккаунт. */
  hasClientAccount: boolean;
  organizationName: string | null;
  profile: AccountProfile;
  trips: AccountTrip[];
  payments: AccountPayment[];
  saved: AccountSaved[];
  conversations: ConversationListItem[];
}

const PAYMENT_PURPOSE_LABELS: Record<string, string> = {
  deposit: "Security deposit",
  balance: "Balance payment",
  full: "Full payment",
  cleaning_fee: "Cleaning fee",
  refund: "Refund",
};

function initialsFrom(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part.charAt(0))
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U"
  );
}

function monthYear(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/** Подтягивает обложку (cover) для набора объектов. */
async function fetchCovers(
  admin: ReturnType<typeof createAdminClient>,
  propertyIds: string[],
): Promise<Map<string, string>> {
  const covers = new Map<string, string>();
  if (propertyIds.length === 0) return covers;
  const { data } = await admin
    .from("property_media")
    .select("property_id, url, category, sort_order")
    .in("property_id", propertyIds)
    .order("sort_order", { ascending: true });
  for (const row of data ?? []) {
    const existing = covers.get(row.property_id);
    // Приоритет у category='cover'; иначе первая по sort_order.
    if (!existing || row.category === "cover") {
      covers.set(row.property_id, row.url);
    }
  }
  return covers;
}

/**
 * Собирает данные клиентского кабинета для текущего пользователя.
 * Привязка к клиенту — через активный portal_account (user_id → contact).
 * Профиль доступен всегда (из contact либо из user_metadata); поездки,
 * платежи и сохранённое — только при наличии клиентского аккаунта.
 */
export async function getAccountData(user: User): Promise<AccountData> {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const metaName =
    (typeof meta.full_name === "string" && meta.full_name.trim()) ||
    (typeof meta.name === "string" && meta.name.trim()) ||
    "";
  const metaPhone = typeof meta.phone === "string" ? meta.phone : null;

  const conversations = await listMyConversations();

  // Активный портальный аккаунт (RLS отдаёт только свои строки).
  const supabase = createClient();
  const { data: account } = await supabase
    .from("portal_accounts")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!account) {
    const fallbackName =
      metaName || (user.email ? user.email.split("@")[0]! : "Guest");
    return {
      hasClientAccount: false,
      organizationName: null,
      profile: {
        name: fallbackName,
        email: user.email ?? null,
        phone: metaPhone,
        initials: initialsFrom(fallbackName),
        memberSince: monthYear(user.created_at ?? null),
      },
      trips: [],
      payments: [],
      saved: [],
      conversations,
    };
  }

  const admin = createAdminClient();
  const [contactResult, organizationResult, bookingsResult, favoritesResult] =
    await Promise.all([
      admin.from("contacts").select("*").eq("id", account.contact_id).maybeSingle(),
      admin
        .from("organizations")
        .select("id, name")
        .eq("id", account.organization_id)
        .maybeSingle(),
      admin
        .from("rental_bookings")
        .select("*")
        .eq("organization_id", account.organization_id)
        .eq("guest_contact_id", account.contact_id)
        .order("check_in", { ascending: false }),
      admin
        .from("favorite_properties")
        .select("*")
        .eq("organization_id", account.organization_id)
        .eq("contact_id", account.contact_id)
        .order("created_at", { ascending: false }),
    ]);

  const contact = contactResult.data;
  const bookings = bookingsResult.data ?? [];
  const favorites = favoritesResult.data ?? [];

  // Платежи — только по бронированиям этого клиента.
  const bookingIds = bookings.map((b) => b.id);
  let payments: AccountPayment[] = [];
  if (bookingIds.length > 0) {
    const { data: paymentRows } = await admin
      .from("rental_payments")
      .select("*")
      .in("booking_id", bookingIds)
      .order("created_at", { ascending: false });
    payments = (paymentRows ?? []).map((row) => {
      const currency = isCurrencyCode(row.currency)
        ? row.currency
        : DEFAULT_CURRENCY;
      return {
        id: row.id,
        date: row.paid_at ?? row.created_at,
        description:
          PAYMENT_PURPOSE_LABELS[row.purpose] ?? row.purpose ?? "Payment",
        amountText: formatCurrency(row.amount, currency, "en"),
        method: row.is_manual ? "Manual" : row.provider,
        status: row.status,
      };
    });
  }

  // Обложки и метаданные объектов (для поездок и сохранённого).
  const propertyIds = [
    ...new Set([
      ...bookings.map((b) => b.property_id),
      ...favorites.map((f) => f.property_id),
    ]),
  ];
  const [covers, propertyRows, locationRows] = await Promise.all([
    fetchCovers(admin, propertyIds),
    propertyIds.length > 0
      ? admin
          .from("properties")
          .select("id, title, slug")
          .in("id", propertyIds)
          .then((r) => r.data ?? [])
      : Promise.resolve([]),
    propertyIds.length > 0
      ? admin
          .from("property_locations")
          .select("property_id, city, area")
          .in("property_id", propertyIds)
          .then((r) => r.data ?? [])
      : Promise.resolve([]),
  ]);
  const propertyById = new Map(propertyRows.map((p) => [p.id, p] as const));
  const locationById = new Map(
    locationRows.map((l) => [l.property_id, l] as const),
  );
  const locationText = (propertyId: string): string | null => {
    const loc = locationById.get(propertyId);
    return [loc?.area, loc?.city].filter(Boolean).join(", ") || null;
  };

  // Цены сохранённых объектов.
  const priceByProperty = new Map<string, string>();
  if (favorites.length > 0) {
    const favIds = favorites.map((f) => f.property_id);
    const { data: prices } = await admin
      .from("property_prices")
      .select("property_id, amount, currency, display_type, price_period")
      .in("property_id", favIds);
    for (const price of prices ?? []) {
      if (price.display_type !== "visible") continue;
      const currency = isCurrencyCode(price.currency)
        ? price.currency
        : DEFAULT_CURRENCY;
      priceByProperty.set(
        price.property_id,
        formatPrice(price.amount, currency, "en", price.price_period),
      );
    }
  }

  const now = Date.now();
  const trips: AccountTrip[] = bookings.map((b) => {
    const property = propertyById.get(b.property_id);
    const status: TripStatus =
      b.status === "cancelled"
        ? "cancelled"
        : new Date(b.check_out).getTime() < now
          ? "past"
          : "upcoming";
    const currency = isCurrencyCode(b.currency) ? b.currency : DEFAULT_CURRENCY;
    return {
      id: b.id,
      reference: b.reference,
      propertyTitle: property?.title ?? "Property",
      propertySlug: property?.slug ?? null,
      img: covers.get(b.property_id) ?? null,
      checkIn: b.check_in,
      checkOut: b.check_out,
      nights: b.nights,
      guests: b.adults + b.children,
      totalText: formatCurrency(b.total, currency, "en"),
      status,
      paid: b.payment_status === "paid",
      createdAt: b.created_at,
      location: locationText(b.property_id),
    };
  });

  const saved: AccountSaved[] = favorites.map((f) => {
    const property = propertyById.get(f.property_id);
    return {
      propertyId: f.property_id,
      title: property?.title ?? "Property",
      slug: property?.slug ?? "",
      location: locationText(f.property_id),
      img: covers.get(f.property_id) ?? null,
      priceText: priceByProperty.get(f.property_id) ?? null,
    };
  });

  const name = contact?.full_name || metaName || "Guest";

  return {
    hasClientAccount: true,
    organizationName: organizationResult.data?.name ?? null,
    profile: {
      name,
      email: contact?.email ?? user.email ?? null,
      phone: contact?.phone ?? metaPhone,
      initials: initialsFrom(name),
      memberSince: monthYear(contact?.created_at ?? user.created_at ?? null),
    },
    trips,
    payments,
    saved,
    conversations,
  };
}
