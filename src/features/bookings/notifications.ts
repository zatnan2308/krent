import { createNotificationEvent } from "@/features/notifications/dispatcher";
import { createAdminClient } from "@/lib/supabase/server";

export type BookingEventType =
  | "booking.created"
  | "booking.confirmed"
  | "booking.cancelled"
  | "booking.completed"
  | "payment.received";

interface BookingEvent {
  organizationId: string;
  bookingId: string;
  type: BookingEventType;
  reference: string;
  guestName: string | null;
  /** true — событие должно породить транзакционное письмо гостю. */
  email?: boolean;
}

type Admin = ReturnType<typeof createAdminClient>;

/** Email-шаблон по типу события бронирования (null — без письма). */
function bookingEmailTemplate(type: BookingEventType): string | null {
  if (type === "booking.created") {
    return "booking.requested";
  }
  if (type === "booking.confirmed") {
    return "booking.confirmed";
  }
  if (type === "payment.received") {
    return "payment.received";
  }
  return null;
}

/** Рассылает письмо гостю по событию бронирования. */
async function dispatchBookingEmail(
  admin: Admin,
  event: BookingEvent,
): Promise<void> {
  const templateKey = bookingEmailTemplate(event.type);
  if (!templateKey) {
    return;
  }
  const { data: booking } = await admin
    .from("rental_bookings")
    .select("guest_email, guest_name, check_in, check_out, property_id")
    .eq("id", event.bookingId)
    .maybeSingle();
  if (!booking || !booking.guest_email) {
    return;
  }

  let propertyTitle = "";
  if (booking.property_id) {
    const { data: property } = await admin
      .from("properties")
      .select("title")
      .eq("id", booking.property_id)
      .maybeSingle();
    propertyTitle = property?.title ?? "";
  }

  await createNotificationEvent({
    organizationId: event.organizationId,
    eventType: templateKey,
    entityType: "booking",
    entityId: event.bookingId,
    recipients: [{ email: booking.guest_email, name: booking.guest_name }],
    variables: {
      property_title: propertyTitle,
      booking_checkin: booking.check_in,
      booking_checkout: booking.check_out,
      booking_reference: event.reference,
    },
  });
}

/**
 * Уведомление по бронированию. Фиксирует событие в audit_logs и
 * запускает транзакционное письмо гостю через Notification Center.
 */
export async function notifyBookingEvent(event: BookingEvent): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("audit_logs").insert({
      organization_id: event.organizationId,
      action: event.type,
      entity_type: "booking",
      entity_id: event.bookingId,
      metadata: {
        reference: event.reference,
        guest_name: event.guestName,
        notification: event.email ? "dispatched" : "logged",
      },
    });
    await dispatchBookingEmail(admin, event);
  } catch {
    // Сбой не должен ломать основной поток бронирования.
  }
}
