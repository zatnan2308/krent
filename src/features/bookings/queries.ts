import { findConflicts } from "@/features/rental-calendar/availability";
import { addDays, todayIso } from "@/features/rental-calendar/date-utils";
import { generateFeedToken } from "@/features/rental-calendar/queries";
import { createAdminClient } from "@/lib/supabase/server";

import {
  buildBookingQuote,
  resolvePromoCode,
  validateStayRules,
  type BookingQuote,
  type NightlyRateConfig,
  type SeasonalRate,
  type StayRulesConfig,
} from "./pricing";
import type {
  BookingPaymentStatus,
  BookingSource,
  BookingStatus,
  RentalBooking,
  RentalFee,
  RentalGuest,
} from "./types";

const DEFAULT_CHECK_DAYS = [0, 1, 2, 3, 4, 5, 6];

/** Генерирует человекочитаемый код бронирования. */
export function generateBookingReference(): string {
  const random = crypto
    .randomUUID()
    .replace(/-/g, "")
    .slice(0, 8)
    .toUpperCase();
  return `BK-${random}`;
}

/** Минимальная проекция объекта для расчёта бронирования. */
export interface BookingProperty {
  id: string;
  organizationId: string;
  title: string;
  slug: string;
  purpose: string;
  status: string;
  visibility: string;
  guestCapacity: number | null;
}

/** Контекст ценообразования и доступности объекта. */
export interface BookingPricingContext {
  property: BookingProperty;
  calendarId: string | null;
  nightly: NightlyRateConfig;
  cleaningFee: number;
  securityDeposit: number;
  taxes: number;
  currency: string;
  stayRules: StayRulesConfig;
  events: {
    id: string;
    status: string;
    start_date: string;
    end_date: string;
  }[];
  /** Базовая посуточная ставка не задана — онлайн-бронирование закрыто. */
  pricingConfigured: boolean;
}

/**
 * Загружает контекст бронирования объекта: правила доступности и цен,
 * сборы из прайса объекта, события календаря. Идёт сервис-клиентом —
 * вызывается из публичного (неаутентифицированного) потока.
 */
export async function loadBookingContext(
  propertyId: string,
  organizationId: string,
): Promise<BookingPricingContext | null> {
  const admin = createAdminClient();

  const { data: property } = await admin
    .from("properties")
    .select(
      "id, organization_id, title, slug, purpose, status, visibility, guest_capacity",
    )
    .eq("id", propertyId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (!property) {
    return null;
  }

  const [priceResult, calendarResult] = await Promise.all([
    admin
      .from("property_prices")
      .select("amount, currency, price_period, cleaning_fee, security_deposit, taxes")
      .eq("property_id", propertyId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    admin
      .from("rental_calendars")
      .select("id")
      .eq("property_id", propertyId)
      .maybeSingle(),
  ]);

  const price = priceResult.data;
  const calendarId = calendarResult.data?.id ?? null;

  let availabilityRule: {
    default_price: number | null;
    weekend_price: number | null;
    currency: string | null;
    min_stay: number;
    max_stay: number | null;
    check_in_days: number[];
    check_out_days: number[];
    buffer_days: number;
  } | null = null;
  let seasonalRates: SeasonalRate[] = [];
  let events: BookingPricingContext["events"] = [];

  if (calendarId) {
    const [ruleResult, priceRulesResult, eventsResult] = await Promise.all([
      admin
        .from("rental_availability_rules")
        .select(
          "default_price, weekend_price, currency, min_stay, max_stay, check_in_days, check_out_days, buffer_days",
        )
        .eq("calendar_id", calendarId)
        .maybeSingle(),
      admin
        .from("rental_price_rules")
        .select("start_date, end_date, price")
        .eq("calendar_id", calendarId)
        .order("start_date", { ascending: true }),
      admin
        .from("rental_calendar_events")
        .select("id, status, start_date, end_date")
        .eq("property_id", propertyId),
    ]);
    availabilityRule = ruleResult.data;
    seasonalRates = (priceRulesResult.data ?? []).map((rule) => ({
      startDate: rule.start_date,
      endDate: rule.end_date,
      price: Number(rule.price),
    }));
    events = eventsResult.data ?? [];
  }

  // Базовая ставка: правило доступности приоритетнее посуточной цены прайса.
  const ruleDefault = availabilityRule?.default_price ?? null;
  const listingNightly =
    price && price.price_period === "night" ? Number(price.amount) : null;
  const defaultPrice = ruleDefault ?? listingNightly;

  const currency =
    availabilityRule?.currency ?? price?.currency ?? "USD";

  return {
    property: {
      id: property.id,
      organizationId: property.organization_id,
      title: property.title,
      slug: property.slug,
      purpose: property.purpose,
      status: property.status,
      visibility: property.visibility,
      guestCapacity: property.guest_capacity,
    },
    calendarId,
    nightly: {
      defaultPrice: defaultPrice ?? 0,
      weekendPrice: availabilityRule?.weekend_price ?? null,
      seasonalRates,
    },
    cleaningFee: price?.cleaning_fee ?? 0,
    securityDeposit: price?.security_deposit ?? 0,
    taxes: price?.taxes ?? 0,
    currency,
    stayRules: {
      minStay: availabilityRule?.min_stay ?? 1,
      maxStay: availabilityRule?.max_stay ?? null,
      checkInDays: availabilityRule?.check_in_days ?? DEFAULT_CHECK_DAYS,
      checkOutDays: availabilityRule?.check_out_days ?? DEFAULT_CHECK_DAYS,
      bufferDays: availabilityRule?.buffer_days ?? 0,
    },
    events,
    pricingConfigured: defaultPrice !== null && defaultPrice > 0,
  };
}

/** Итог проверки бронирования: расчёт + список проблем. */
export interface BookingEvaluation {
  quote: BookingQuote;
  issues: string[];
  available: boolean;
  pricingConfigured: boolean;
}

/**
 * Считает стоимость и проверяет даты бронирования: правила доступности
 * и пересечение с занятыми датами (защита от double booking).
 */
export function evaluateBooking(
  context: BookingPricingContext,
  checkIn: string,
  checkOut: string,
  promoCode: string | null,
): BookingEvaluation {
  const promo = resolvePromoCode(promoCode);
  const quote = buildBookingQuote({
    checkIn,
    checkOut,
    currency: context.currency,
    nightly: context.nightly,
    cleaningFee: context.cleaningFee,
    securityDeposit: context.securityDeposit,
    taxes: context.taxes,
    promo,
  });

  const issues = validateStayRules(checkIn, checkOut, context.stayRules);
  // Буфер между бронями: расширяем проверяемый диапазон на bufferDays с обеих
  // сторон, чтобы рядом с занятыми датами нельзя было забронировать.
  const buffer = context.stayRules.bufferDays;
  const conflictStart = buffer > 0 ? addDays(checkIn, -buffer) : checkIn;
  const conflictEnd = buffer > 0 ? addDays(checkOut, buffer) : checkOut;
  const conflicts = findConflicts(context.events, conflictStart, conflictEnd);
  const available = conflicts.length === 0;
  if (!available) {
    issues.push("These dates are not available.");
  }

  return {
    quote,
    issues,
    available,
    pricingConfigured: context.pricingConfigured,
  };
}

/**
 * Находит календарь объекта; при отсутствии создаёт его с дефолтным
 * правилом доступности и токеном экспорта (сервис-клиентом).
 */
export async function findOrCreateCalendarAdmin(
  propertyId: string,
  organizationId: string,
): Promise<string | null> {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("rental_calendars")
    .select("id")
    .eq("property_id", propertyId)
    .maybeSingle();
  if (existing) {
    return existing.id;
  }

  const { data: created, error } = await admin
    .from("rental_calendars")
    .insert({ organization_id: organizationId, property_id: propertyId })
    .select("id")
    .single();
  if (error || !created) {
    // Возможна гонка по unique(property_id) — пробуем найти снова.
    const { data: retry } = await admin
      .from("rental_calendars")
      .select("id")
      .eq("property_id", propertyId)
      .maybeSingle();
    return retry?.id ?? null;
  }

  await admin.from("rental_availability_rules").insert({
    organization_id: organizationId,
    calendar_id: created.id,
  });
  await admin.from("ical_export_tokens").insert({
    organization_id: organizationId,
    calendar_id: created.id,
    token: generateFeedToken(),
  });
  return created.id;
}

/** Статусы, занимающие даты (дублирует набор из availability). */
const OCCUPYING_STATUSES = new Set([
  "booked",
  "blocked",
  "pending",
  "maintenance",
  "cleaning",
]);

/**
 * Занятые даты объекта начиная с сегодняшнего дня — для дизейбла в публичном
 * календаре бронирования. Разворачивает занимающие интервалы [start, end) в
 * отдельные ISO-даты.
 */
export async function getBookedDates(propertyId: string): Promise<string[]> {
  const admin = createAdminClient();
  const today = todayIso();
  const { data } = await admin
    .from("rental_calendar_events")
    .select("status, start_date, end_date")
    .eq("property_id", propertyId)
    .gte("end_date", today);
  const dates = new Set<string>();
  for (const event of data ?? []) {
    if (!OCCUPYING_STATUSES.has(event.status)) {
      continue;
    }
    let cursor =
      event.start_date < today ? today : event.start_date;
    while (cursor < event.end_date) {
      dates.add(cursor);
      cursor = addDays(cursor, 1);
    }
  }
  return [...dates];
}

// ---- Dashboard ------------------------------------------------

/** Строка списка бронирований в dashboard. */
export interface BookingListItem {
  id: string;
  reference: string;
  propertyTitle: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  total: number;
  currency: string;
  status: BookingStatus;
  paymentStatus: BookingPaymentStatus;
  source: BookingSource;
  createdAt: string;
}

/** Список бронирований организации с опциональным фильтром по статусу. */
export async function listBookings(
  organizationId: string,
  filters: { status?: BookingStatus } = {},
): Promise<BookingListItem[]> {
  const admin = createAdminClient();
  let query = admin
    .from("rental_bookings")
    .select("*")
    .eq("organization_id", organizationId);
  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  const { data } = await query.order("created_at", { ascending: false });
  const bookings = data ?? [];

  const propertyIds = [...new Set(bookings.map((row) => row.property_id))];
  const titles = new Map<string, string>();
  if (propertyIds.length > 0) {
    const { data: properties } = await admin
      .from("properties")
      .select("id, title")
      .in("id", propertyIds);
    for (const property of properties ?? []) {
      titles.set(property.id, property.title);
    }
  }

  return bookings.map((row) => ({
    id: row.id,
    reference: row.reference,
    propertyTitle: titles.get(row.property_id) ?? "Property",
    guestName: row.guest_name ?? "Guest",
    checkIn: row.check_in,
    checkOut: row.check_out,
    nights: row.nights,
    total: row.total,
    currency: row.currency,
    status: row.status,
    paymentStatus: row.payment_status,
    source: row.source,
    createdAt: row.created_at,
  }));
}

/** Полные данные одного бронирования для страницы деталей. */
export interface BookingDetail {
  booking: RentalBooking;
  property: { id: string; title: string; slug: string } | null;
  contact: {
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
  } | null;
  fees: RentalFee[];
  guests: RentalGuest[];
}

/** Бронирование организации со связанными данными. */
export async function getBookingDetail(
  organizationId: string,
  bookingId: string,
): Promise<BookingDetail | null> {
  const admin = createAdminClient();
  const { data: booking } = await admin
    .from("rental_bookings")
    .select("*")
    .eq("id", bookingId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (!booking) {
    return null;
  }

  const [propertyResult, feesResult, guestsResult] = await Promise.all([
    admin
      .from("properties")
      .select("id, title, slug")
      .eq("id", booking.property_id)
      .maybeSingle(),
    admin
      .from("rental_fees")
      .select("*")
      .eq("booking_id", bookingId)
      .order("sort_order", { ascending: true }),
    admin
      .from("rental_guests")
      .select("*")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: true }),
  ]);

  let contact: BookingDetail["contact"] = null;
  if (booking.guest_contact_id) {
    const { data: contactRow } = await admin
      .from("contacts")
      .select("id, full_name, email, phone")
      .eq("id", booking.guest_contact_id)
      .maybeSingle();
    contact = contactRow;
  }

  return {
    booking,
    property: propertyResult.data,
    contact,
    fees: feesResult.data ?? [],
    guests: guestsResult.data ?? [],
  };
}
