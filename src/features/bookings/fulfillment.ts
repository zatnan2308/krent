import { createAdminClient } from "@/lib/supabase/server";

import { notifyBookingEvent } from "./notifications";
import type { RentalBooking } from "./types";

/**
 * Поток выполнения бронирования: подтверждение, оплата, отмена,
 * завершение. Все операции идут сервис-клиентом — функции вызываются
 * как из dashboard (после проверки прав), так и из webhook-обработчика
 * платежа (без пользователя). Операции идемпотентны.
 */

async function loadBooking(
  organizationId: string,
  bookingId: string,
): Promise<RentalBooking | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("rental_bookings")
    .select("*")
    .eq("id", bookingId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  return data;
}

/**
 * Отмечает бронирование оплаченным: статус confirmed + paid, даты
 * календаря блокируются (pending-событие становится booked), создаётся
 * транзакционное email-событие.
 */
export async function markBookingPaid(
  organizationId: string,
  bookingId: string,
): Promise<RentalBooking | null> {
  const booking = await loadBooking(organizationId, bookingId);
  if (!booking || booking.status === "cancelled") {
    return booking;
  }
  const alreadyDone =
    booking.payment_status === "paid" && booking.status === "confirmed";

  const admin = createAdminClient();
  await admin
    .from("rental_bookings")
    .update({
      status: "confirmed",
      payment_status: "paid",
      confirmed_at: booking.confirmed_at ?? new Date().toISOString(),
    })
    .eq("id", bookingId);

  // Блокируем даты: связанное pending-событие календаря становится booked.
  if (booking.calendar_event_id) {
    await admin
      .from("rental_calendar_events")
      .update({ status: "booked" })
      .eq("id", booking.calendar_event_id);
  }

  if (!alreadyDone) {
    await notifyBookingEvent({
      organizationId: booking.organization_id,
      bookingId: booking.id,
      type: "payment.received",
      reference: booking.reference,
      guestName: booking.guest_name,
      email: true,
    });
  }
  return booking;
}

/**
 * Подтверждает бронирование вручную (без онлайн-оплаты): статус
 * confirmed, даты календаря блокируются.
 */
export async function confirmBookingRecord(
  organizationId: string,
  bookingId: string,
): Promise<RentalBooking | null> {
  const booking = await loadBooking(organizationId, bookingId);
  if (!booking) {
    return null;
  }
  if (booking.status === "cancelled" || booking.status === "completed") {
    return booking;
  }

  const admin = createAdminClient();
  await admin
    .from("rental_bookings")
    .update({
      status: "confirmed",
      confirmed_at: booking.confirmed_at ?? new Date().toISOString(),
    })
    .eq("id", bookingId);

  if (booking.calendar_event_id) {
    await admin
      .from("rental_calendar_events")
      .update({ status: "booked" })
      .eq("id", booking.calendar_event_id);
  }

  if (booking.status !== "confirmed") {
    await notifyBookingEvent({
      organizationId: booking.organization_id,
      bookingId: booking.id,
      type: "booking.confirmed",
      reference: booking.reference,
      guestName: booking.guest_name,
      email: true,
    });
  }
  return booking;
}

/**
 * Отменяет бронирование: статус cancelled, связанное событие календаря
 * удаляется — даты снова свободны.
 */
export async function cancelBookingRecord(
  organizationId: string,
  bookingId: string,
): Promise<RentalBooking | null> {
  const booking = await loadBooking(organizationId, bookingId);
  if (!booking) {
    return null;
  }
  if (booking.status === "cancelled") {
    return booking;
  }

  const admin = createAdminClient();
  await admin
    .from("rental_bookings")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", bookingId);

  if (booking.calendar_event_id) {
    await admin
      .from("rental_calendar_events")
      .delete()
      .eq("id", booking.calendar_event_id);
  }

  await notifyBookingEvent({
    organizationId: booking.organization_id,
    bookingId: booking.id,
    type: "booking.cancelled",
    reference: booking.reference,
    guestName: booking.guest_name,
    email: true,
  });
  return booking;
}

/** Завершает подтверждённое бронирование (статус completed). */
export async function completeBookingRecord(
  organizationId: string,
  bookingId: string,
): Promise<RentalBooking | null> {
  const booking = await loadBooking(organizationId, bookingId);
  if (!booking) {
    return null;
  }
  if (booking.status !== "confirmed") {
    return booking;
  }

  const admin = createAdminClient();
  await admin
    .from("rental_bookings")
    .update({ status: "completed" })
    .eq("id", bookingId);

  await notifyBookingEvent({
    organizationId: booking.organization_id,
    bookingId: booking.id,
    type: "booking.completed",
    reference: booking.reference,
    guestName: booking.guest_name,
  });
  return booking;
}
