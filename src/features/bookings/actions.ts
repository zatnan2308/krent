"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { dispatchWebhookEvent } from "@/features/agency-api/webhooks";
import { createAdminClient } from "@/lib/supabase/server";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";
import { resolvePublicOrganization } from "@/server/public-site";
import type { TablesInsert } from "@/types/database";

import {
  cancelBookingRecord,
  completeBookingRecord,
  confirmBookingRecord,
} from "./fulfillment";
import { notifyBookingEvent } from "./notifications";
import type { BookingQuote } from "./pricing";
import {
  evaluateBooking,
  findOrCreateCalendarAdmin,
  generateBookingReference,
  loadBookingContext,
  type BookingPricingContext,
} from "./queries";
import {
  bookingQuoteSchema,
  requestBookingSchema,
  type ActionResult,
  type BookingQuoteRequest,
  type QuoteResult,
  type RequestBookingInput,
  type RequestBookingResult,
} from "./schema";

/** Объект доступен для онлайн-бронирования. */
function isBookable(context: BookingPricingContext): boolean {
  return (
    context.property.status === "active" &&
    context.property.visibility === "public" &&
    (context.property.purpose === "short_term_rental" ||
      context.property.purpose === "mixed")
  );
}

/** Собирает строки расчёта стоимости бронирования. */
function buildFeeRows(
  organizationId: string,
  bookingId: string,
  quote: BookingQuote,
): TablesInsert<"rental_fees">[] {
  const rows: TablesInsert<"rental_fees">[] = [];
  let sortOrder = 0;
  const add = (
    kind: TablesInsert<"rental_fees">["kind"],
    label: string,
    amount: number,
    isRefundable = false,
  ) => {
    rows.push({
      organization_id: organizationId,
      booking_id: bookingId,
      kind,
      label,
      amount,
      currency: quote.currency,
      is_refundable: isRefundable,
      sort_order: sortOrder,
    });
    sortOrder += 1;
  };

  add(
    "accommodation",
    `Accommodation · ${quote.nights} night(s)`,
    quote.subtotal,
  );
  if (quote.cleaningFee > 0) {
    add("cleaning", "Cleaning fee", quote.cleaningFee);
  }
  if (quote.taxes > 0) {
    add("tax", "Taxes", quote.taxes);
  }
  if (quote.discount > 0) {
    add(
      "discount",
      quote.promoCode ? `Discount (${quote.promoCode})` : "Discount",
      -quote.discount,
    );
  }
  if (quote.securityDeposit > 0) {
    add("security_deposit", "Security deposit", quote.securityDeposit, true);
  }
  return rows;
}

/**
 * Публичный расчёт стоимости бронирования. Считается на сервере —
 * клиентским числам доверять нельзя. Возвращает котировку, проблемы
 * с правилами доступности и флаг занятости дат.
 */
export async function getBookingQuote(
  input: BookingQuoteRequest,
): Promise<QuoteResult> {
  const parsed = bookingQuoteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the booking details." };
  }
  const data = parsed.data;

  const organization = await resolvePublicOrganization();
  if (!organization) {
    return { ok: false, error: "This site is not available right now." };
  }

  const context = await loadBookingContext(data.propertyId, organization.id);
  if (!context || !isBookable(context)) {
    return {
      ok: false,
      error: "This property is not available for booking.",
    };
  }
  if (!context.pricingConfigured) {
    return {
      ok: false,
      error: "Online booking is not available for this property.",
    };
  }

  const evaluation = evaluateBooking(
    context,
    data.checkIn,
    data.checkOut,
    data.promoCode,
  );
  return {
    ok: true,
    quote: evaluation.quote,
    available: evaluation.available,
    issues: evaluation.issues,
  };
}

/**
 * Публичный запрос на бронирование. Создаёт бронирование, CRM-лид,
 * pending-событие календаря и событие-уведомление. Стоимость
 * пересчитывается на сервере; даты проверяются на double booking.
 */
export async function requestBooking(
  input: RequestBookingInput,
): Promise<RequestBookingResult> {
  const parsed = requestBookingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the booking form." };
  }
  const data = parsed.data;

  const organization = await resolvePublicOrganization();
  if (!organization) {
    return { ok: false, error: "This site is not available right now." };
  }

  const context = await loadBookingContext(data.propertyId, organization.id);
  if (!context || !isBookable(context)) {
    return {
      ok: false,
      error: "This property is not available for booking.",
    };
  }
  if (!context.pricingConfigured) {
    return {
      ok: false,
      error: "Online booking is not available for this property.",
    };
  }

  const evaluation = evaluateBooking(
    context,
    data.checkIn,
    data.checkOut,
    data.promoCode,
  );
  if (evaluation.issues.length > 0) {
    return {
      ok: false,
      error: evaluation.issues[0] ?? "These dates are not available.",
    };
  }

  const capacity = context.property.guestCapacity;
  if (capacity !== null && data.adults + data.children > capacity) {
    return {
      ok: false,
      error: `This property accommodates up to ${capacity} guest(s).`,
    };
  }

  const calendarId = await findOrCreateCalendarAdmin(
    data.propertyId,
    organization.id,
  );
  if (!calendarId) {
    return { ok: false, error: "Could not prepare the calendar." };
  }

  const admin = createAdminClient();
  const quote = evaluation.quote;
  const email = data.guestEmail.trim().toLowerCase();
  const guestName = data.guestName.trim();
  const host =
    (headers().get("host") ?? "").split(":")[0]?.toLowerCase() ?? "";

  // ---- Контакт: найти по email либо создать ------------------
  let contactId: string;
  const { data: existingContact } = await admin
    .from("contacts")
    .select("id")
    .eq("organization_id", organization.id)
    .eq("email", email)
    .maybeSingle();
  if (existingContact) {
    contactId = existingContact.id;
  } else {
    const { data: createdContact, error: contactError } = await admin
      .from("contacts")
      .insert({
        organization_id: organization.id,
        full_name: guestName,
        email,
        phone: data.guestPhone,
        preferred_language: data.locale,
        preferred_currency: quote.currency,
      })
      .select("id")
      .single();
    if (contactError || !createdContact) {
      const { data: retry } = await admin
        .from("contacts")
        .select("id")
        .eq("organization_id", organization.id)
        .eq("email", email)
        .maybeSingle();
      if (!retry) {
        return { ok: false, error: "Could not save your details." };
      }
      contactId = retry.id;
    } else {
      contactId = createdContact.id;
    }
  }

  // ---- CRM-лид ----------------------------------------------
  const messageParts = [
    `Booking request: ${data.checkIn} → ${data.checkOut} (${quote.nights} night(s)).`,
    `Guests: ${data.adults} adult(s), ${data.children} child(ren), ${data.pets} pet(s).`,
  ];
  if (data.guestMessage && data.guestMessage.trim()) {
    messageParts.push(data.guestMessage.trim());
  }
  const { data: lead } = await admin
    .from("leads")
    .insert({
      organization_id: organization.id,
      contact_id: contactId,
      property_id: data.propertyId,
      type: "booking",
      status: "new",
      source: "website",
      source_domain: host || null,
      message: messageParts.join("\n"),
      language: data.locale,
      currency: quote.currency,
    })
    .select("id")
    .single();
  const leadId = lead?.id ?? null;

  // ---- Бронирование (повтор при коллизии reference) ---------
  let bookingId: string | null = null;
  let reference = "";
  for (let attempt = 0; attempt < 2 && !bookingId; attempt += 1) {
    reference = generateBookingReference();
    const { data: booking } = await admin
      .from("rental_bookings")
      .insert({
        organization_id: organization.id,
        property_id: data.propertyId,
        calendar_id: calendarId,
        guest_contact_id: contactId,
        lead_id: leadId,
        reference,
        check_in: data.checkIn,
        check_out: data.checkOut,
        nights: quote.nights,
        adults: data.adults,
        children: data.children,
        pets: data.pets,
        status: "pending",
        source: "website",
        subtotal: quote.subtotal,
        cleaning_fee: quote.cleaningFee,
        security_deposit: quote.securityDeposit,
        taxes: quote.taxes,
        discount: quote.discount,
        total: quote.total,
        currency: quote.currency,
        payment_status: "unpaid",
        promo_code: quote.promoCode,
        guest_name: guestName,
        guest_email: email,
        guest_phone: data.guestPhone,
        guest_message: data.guestMessage,
      })
      .select("id")
      .single();
    if (booking) {
      bookingId = booking.id;
    }
  }
  if (!bookingId) {
    return { ok: false, error: "Could not create the booking." };
  }

  // ---- Pending-событие календаря (защита от double booking) --
  const { data: event, error: eventError } = await admin
    .from("rental_calendar_events")
    .insert({
      organization_id: organization.id,
      calendar_id: calendarId,
      property_id: data.propertyId,
      source: "direct",
      status: "pending",
      start_date: data.checkIn,
      end_date: data.checkOut,
      title: `Booking ${reference}`,
      metadata: { booking_id: bookingId },
    })
    .select("id")
    .single();
  if (eventError || !event) {
    await admin.from("rental_bookings").delete().eq("id", bookingId);
    return { ok: false, error: "These dates are no longer available." };
  }
  await admin
    .from("rental_bookings")
    .update({ calendar_event_id: event.id })
    .eq("id", bookingId);

  // ---- Строки расчёта стоимости -----------------------------
  const feeRows = buildFeeRows(organization.id, bookingId, quote);
  if (feeRows.length > 0) {
    await admin.from("rental_fees").insert(feeRows);
  }

  // ---- Основной гость ---------------------------------------
  await admin.from("rental_guests").insert({
    organization_id: organization.id,
    booking_id: bookingId,
    full_name: guestName,
    email,
    phone: data.guestPhone,
    is_primary: true,
    guest_category: "adult",
  });

  await notifyBookingEvent({
    organizationId: organization.id,
    bookingId,
    type: "booking.created",
    reference,
    guestName,
    email: true,
  });

  await dispatchWebhookEvent({
    organizationId: organization.id,
    eventType: "booking.created",
    entityType: "booking",
    entityId: bookingId,
    payload: {
      booking_id: bookingId,
      property_id: data.propertyId,
      check_in: data.checkIn,
      check_out: data.checkOut,
      reference,
    },
  });

  revalidatePath("/dashboard/bookings");
  return { ok: true, bookingId, reference };
}

// ---- Dashboard ------------------------------------------------

/** Гард: активная организация + право bookings.manage. */
async function requireBookingAccess(): Promise<
  { ok: true; organizationId: string } | { ok: false; error: string }
> {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false, error: "No active organization." };
  }
  if (!hasPermission(context, "bookings.manage")) {
    return {
      ok: false,
      error: "You do not have permission to manage bookings.",
    };
  }
  return { ok: true, organizationId: context.organization.id };
}

function revalidateBooking(bookingId: string): void {
  revalidatePath("/dashboard/bookings");
  revalidatePath(`/dashboard/bookings/${bookingId}`);
}

/** Подтверждает бронирование вручную (без онлайн-оплаты). */
export async function confirmBookingAction(
  bookingId: string,
): Promise<ActionResult> {
  if (!z.uuid().safeParse(bookingId).success) {
    return { ok: false, error: "Invalid booking." };
  }
  const access = await requireBookingAccess();
  if (!access.ok) {
    return access;
  }
  const booking = await confirmBookingRecord(access.organizationId, bookingId);
  if (!booking) {
    return { ok: false, error: "Booking not found." };
  }
  revalidateBooking(bookingId);
  return { ok: true };
}

/** Отменяет бронирование и освобождает даты календаря. */
export async function cancelBookingAction(
  bookingId: string,
): Promise<ActionResult> {
  if (!z.uuid().safeParse(bookingId).success) {
    return { ok: false, error: "Invalid booking." };
  }
  const access = await requireBookingAccess();
  if (!access.ok) {
    return access;
  }
  const booking = await cancelBookingRecord(access.organizationId, bookingId);
  if (!booking) {
    return { ok: false, error: "Booking not found." };
  }
  await dispatchWebhookEvent({
    organizationId: access.organizationId,
    eventType: "booking.cancelled",
    entityType: "booking",
    entityId: bookingId,
    payload: { booking_id: bookingId },
  });
  revalidateBooking(bookingId);
  return { ok: true };
}

/** Завершает подтверждённое бронирование. */
export async function completeBookingAction(
  bookingId: string,
): Promise<ActionResult> {
  if (!z.uuid().safeParse(bookingId).success) {
    return { ok: false, error: "Invalid booking." };
  }
  const access = await requireBookingAccess();
  if (!access.ok) {
    return access;
  }
  const booking = await completeBookingRecord(
    access.organizationId,
    bookingId,
  );
  if (!booking) {
    return { ok: false, error: "Booking not found." };
  }
  revalidateBooking(bookingId);
  return { ok: true };
}
