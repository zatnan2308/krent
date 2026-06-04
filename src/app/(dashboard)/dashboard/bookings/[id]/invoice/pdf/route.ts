import { NextResponse } from "next/server";

import { buildInvoicePdf } from "@/features/bookings/invoice-pdf";
import { createAdminClient } from "@/lib/supabase/server";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

export const dynamic = "force-dynamic";

/** Отдаёт PDF-инвойс бронирования (генерация сервером через pdf-lib). */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const context = await requireOrganizationContext();
  if (!context.organization || !hasPermission(context, "bookings.view")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const admin = createAdminClient();
  const { data: booking } = await admin
    .from("rental_bookings")
    .select(
      "id, reference, check_in, check_out, nights, adults, children, pets, status, total, currency, payment_status, guest_name, guest_email, guest_phone, property_id",
    )
    .eq("id", params.id)
    .eq("organization_id", context.organization.id)
    .maybeSingle();
  if (!booking) {
    return new NextResponse("Not found", { status: 404 });
  }

  const [propertyResult, feesResult] = await Promise.all([
    admin
      .from("properties")
      .select("title")
      .eq("id", booking.property_id)
      .maybeSingle(),
    admin
      .from("rental_fees")
      .select("label, amount, currency")
      .eq("booking_id", booking.id)
      .order("sort_order", { ascending: true }),
  ]);

  const pdfBytes = await buildInvoicePdf({
    organizationName: context.organization.name,
    reference: booking.reference,
    issuedDate: new Date().toISOString().slice(0, 10),
    status: booking.status,
    paymentStatus: booking.payment_status,
    guestName: booking.guest_name ?? "Guest",
    guestEmail: booking.guest_email,
    guestPhone: booking.guest_phone,
    propertyTitle: propertyResult.data?.title ?? "Property",
    checkIn: booking.check_in,
    checkOut: booking.check_out,
    nights: booking.nights,
    adults: booking.adults,
    children: booking.children,
    pets: booking.pets,
    fees: (feesResult.data ?? []).map((fee) => ({
      label: fee.label,
      amount: fee.amount,
      currency: fee.currency,
    })),
    total: booking.total,
    currency: booking.currency,
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="invoice-${booking.reference}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
