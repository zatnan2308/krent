"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { markBookingPaid } from "@/features/bookings/fulfillment";
import { createAdminClient } from "@/lib/supabase/server";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

const submitProofSchema = z.object({
  rentalPaymentId: z.guid(),
  txHash: z.string().trim().max(200).nullable(),
  network: z.string().trim().max(60).nullable(),
  amount: z.number().nullable(),
  currency: z.string().trim().max(10).nullable(),
  proofUrl: z.url().nullable(),
  notes: z.string().trim().max(2000).nullable(),
});
export type SubmitCryptoProofInput = z.infer<typeof submitProofSchema>;

const reviewProofSchema = z.object({
  proofId: z.guid(),
  decision: z.enum(["approved", "rejected"]),
  reviewerNotes: z.string().trim().max(2000).nullable(),
});
export type ReviewCryptoProofInput = z.infer<typeof reviewProofSchema>;

export type CryptoProofResult = { ok: true } | { ok: false; error: string };

/**
 * Гость подаёт подтверждение оплаты криптой. Запись доступна гостю
 * через portal или прямой ссылке на бронирование; для упрощения
 * сейчас вызов делается из admin UI (менеджер может ввести данные за
 * клиента). Если потребуется публичный поток — вынести в API route с
 * валидацией по reference платежа.
 */
export async function submitCryptoProof(
  input: SubmitCryptoProofInput,
): Promise<CryptoProofResult> {
  const parsed = submitProofSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the proof form." };
  }
  const data = parsed.data;
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false, error: "No active organization." };
  }
  if (!hasPermission(context, "payments.manage")) {
    return { ok: false, error: "You cannot submit proofs." };
  }
  const admin = createAdminClient();
  const { data: payment } = await admin
    .from("rental_payments")
    .select("id, organization_id")
    .eq("id", data.rentalPaymentId)
    .eq("organization_id", context.organization.id)
    .maybeSingle();
  if (!payment) {
    return { ok: false, error: "Payment not found." };
  }
  const { error } = await admin.from("crypto_payment_proofs").insert({
    organization_id: payment.organization_id,
    rental_payment_id: payment.id,
    tx_hash: data.txHash,
    network: data.network,
    amount: data.amount,
    currency: data.currency,
    proof_url: data.proofUrl,
    notes: data.notes,
  });
  if (error) {
    return { ok: false, error: "Could not store the proof." };
  }
  revalidatePath("/dashboard/bookings");
  return { ok: true };
}

/**
 * Менеджер подтверждает/отклоняет proof. При approve — платёж и
 * бронирование переходят в succeeded/confirmed, даты блокируются.
 */
export async function reviewCryptoProof(
  input: ReviewCryptoProofInput,
): Promise<CryptoProofResult> {
  const parsed = reviewProofSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid review input." };
  }
  const data = parsed.data;
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false, error: "No active organization." };
  }
  if (!hasPermission(context, "payments.manage")) {
    return { ok: false, error: "You cannot review proofs." };
  }
  const admin = createAdminClient();
  const { data: proof } = await admin
    .from("crypto_payment_proofs")
    .select(
      "id, organization_id, rental_payment_id, status, rental_payments(booking_id)",
    )
    .eq("id", data.proofId)
    .eq("organization_id", context.organization.id)
    .maybeSingle();
  if (!proof) {
    return { ok: false, error: "Proof not found." };
  }
  if (proof.status !== "pending") {
    return { ok: false, error: "Proof was already reviewed." };
  }
  await admin
    .from("crypto_payment_proofs")
    .update({
      status: data.decision,
      reviewer_notes: data.reviewerNotes,
      reviewed_at: new Date().toISOString(),
      reviewed_by: context.user.id,
    })
    .eq("id", proof.id);

  if (data.decision === "approved") {
    await admin
      .from("rental_payments")
      .update({
        status: "succeeded",
        paid_at: new Date().toISOString(),
      })
      .eq("id", proof.rental_payment_id);
    await admin
      .from("payment_transactions")
      .update({ status: "succeeded" })
      .eq("rental_payment_id", proof.rental_payment_id)
      .eq("kind", "charge");
    const bookingId = (proof.rental_payments as { booking_id: string } | null)
      ?.booking_id;
    if (bookingId) {
      await markBookingPaid(proof.organization_id, bookingId);
    }
  } else {
    await admin
      .from("rental_payments")
      .update({ status: "failed" })
      .eq("id", proof.rental_payment_id);
  }

  revalidatePath("/dashboard/bookings");
  return { ok: true };
}
