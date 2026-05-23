import { NextResponse, type NextRequest } from "next/server";

import { markBookingPaid } from "@/features/bookings/fulfillment";
import { capturePayPalOrder } from "@/features/payments/providers/paypal";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Завершает PayPal-платёж после approve. PayPal редиректит гостя на
 * success_url с параметром `token=<order_id>`; мы вызываем capture и
 * обновляем `rental_payments`/`rental_bookings`.
 *
 * Подделать сторонний редирект невозможно: capture требует валидный
 * order_id, который сам по себе не выдаёт денег без подписи PayPal на
 * успехе.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get("token") ?? url.searchParams.get("order");
  const returnTo = url.searchParams.get("return") ?? "/";
  if (!orderId) {
    return NextResponse.redirect(new URL(returnTo, request.url));
  }

  const admin = createAdminClient();
  const { data: payment } = await admin
    .from("rental_payments")
    .select("id, organization_id, booking_id, status")
    .eq("provider_reference", orderId)
    .maybeSingle();

  const captureResult = await capturePayPalOrder(orderId);

  if (payment) {
    const newStatus: "succeeded" | "failed" | null = captureResult.ok
      ? "succeeded"
      : captureResult.status === "failed"
        ? "failed"
        : null;
    if (newStatus) {
      await admin
        .from("rental_payments")
        .update({
          status: newStatus,
          paid_at: newStatus === "succeeded" ? new Date().toISOString() : null,
        })
        .eq("id", payment.id);
      await admin
        .from("payment_transactions")
        .update({
          status: newStatus,
          provider_transaction_id: captureResult.captureId,
        })
        .eq("rental_payment_id", payment.id)
        .eq("kind", "charge");
    }
    if (captureResult.ok) {
      await markBookingPaid(payment.organization_id, payment.booking_id);
    }
  }

  return NextResponse.redirect(new URL(returnTo, request.url));
}
