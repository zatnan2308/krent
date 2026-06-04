"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { markBookingPaid } from "@/features/bookings/fulfillment";
import { createAdminClient } from "@/lib/supabase/server";
import { logAudit } from "@/server/audit";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

export type ActionResult = { ok: true } | { ok: false; error: string };

const markPaidSchema = z.object({
  paymentId: z.guid(),
  note: z.string().trim().max(500).nullable(),
});
export type MarkPaidInput = z.infer<typeof markPaidSchema>;

/**
 * Помечает rental_payment как succeeded (для manual/cash/wire/crypto),
 * обновляет связанную транзакцию и confirmирует booking.
 */
export async function markPaymentAsPaid(input: MarkPaidInput): Promise<ActionResult> {
  const parsed = markPaidSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };
  const context = await requireOrganizationContext();
  if (!context.organization) return { ok: false, error: "No organization." };
  if (!hasPermission(context, "payments.manage")) {
    return { ok: false, error: "You cannot manage payments." };
  }
  const admin = createAdminClient();
  const { data: payment } = await admin
    .from("rental_payments")
    .select("id, organization_id, booking_id, status")
    .eq("id", parsed.data.paymentId)
    .eq("organization_id", context.organization.id)
    .maybeSingle();
  if (!payment) return { ok: false, error: "Payment not found." };
  if (payment.status === "succeeded") {
    return { ok: true };
  }
  await admin
    .from("rental_payments")
    .update({ status: "succeeded", paid_at: new Date().toISOString() })
    .eq("id", payment.id);
  await admin
    .from("payment_transactions")
    .update({ status: "succeeded" })
    .eq("rental_payment_id", payment.id)
    .eq("kind", "charge");
  await markBookingPaid(payment.organization_id, payment.booking_id);
  await logAudit({
    organizationId: payment.organization_id,
    userId: context.user.id,
    action: "payment.marked_paid",
    entityType: "payment",
    entityId: payment.id,
    metadata: { note: parsed.data.note },
  });
  revalidatePath(`/dashboard/bookings/${payment.booking_id}`);
  revalidatePath("/dashboard/bookings");
  return { ok: true };
}
