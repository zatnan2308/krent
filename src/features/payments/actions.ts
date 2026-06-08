"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { markBookingPaid } from "@/features/bookings/fulfillment";
import { createAdminClient } from "@/lib/supabase/server";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";
import { resolvePublicOrganization } from "@/server/public-site";

import { isProviderOperational } from "./config";
import { getPaymentProvider } from "./provider";
import { resolveProvider } from "./queries";
import {
  issueRefundSchema,
  recordManualPaymentSchema,
  savePaymentProviderSchema,
  startPaymentSchema,
  type ActionResult,
  type IssueRefundInput,
  type RecordManualPaymentInput,
  type SavePaymentProviderInput,
  type StartPaymentInput,
  type StartPaymentResult,
} from "./schema";
import type { PaymentStatus, RefundStatus } from "./types";

/**
 * Запускает онлайн-оплату бронирования выбранным провайдером. Создаёт
 * запись платежа, обращается к адаптеру провайдера и возвращает либо
 * URL редиректа (Stripe), либо инструкции ручной оплаты (crypto).
 */
export async function startBookingPayment(
  input: StartPaymentInput,
): Promise<StartPaymentResult> {
  const parsed = startPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid payment request." };
  }
  const data = parsed.data;

  const organization = await resolvePublicOrganization();
  if (!organization) {
    return { ok: false, error: "This site is not available right now." };
  }

  const admin = createAdminClient();
  const { data: booking } = await admin
    .from("rental_bookings")
    .select("*")
    .eq("id", data.bookingId)
    .eq("organization_id", organization.id)
    .maybeSingle();
  if (!booking) {
    return { ok: false, error: "Booking not found." };
  }
  if (booking.status === "cancelled" || booking.payment_status === "paid") {
    return { ok: false, error: "This booking cannot be paid online." };
  }
  if (booking.total <= 0) {
    return { ok: false, error: "This booking has no payable amount." };
  }

  const resolved = await resolveProvider(organization.id, data.provider);
  if (!resolved || !resolved.row.is_enabled) {
    return { ok: false, error: "This payment method is not available." };
  }
  if (!isProviderOperational(data.provider)) {
    return { ok: false, error: "This payment method is not available yet." };
  }

  const isManual = data.provider === "crypto" || data.provider === "manual";
  const { data: payment } = await admin
    .from("rental_payments")
    .insert({
      organization_id: organization.id,
      booking_id: booking.id,
      payment_provider_id: resolved.row.id,
      provider: data.provider,
      purpose: "booking_total",
      status: "pending",
      amount: booking.total,
      currency: booking.currency,
      is_manual: isManual,
    })
    .select("id")
    .single();
  if (!payment) {
    return { ok: false, error: "Could not start the payment." };
  }

  // URL возврата строим из хоста запроса и пути виджета.
  const host =
    (headers().get("host") ?? "").split(":")[0]?.toLowerCase() ?? "";
  const protocol =
    host.startsWith("localhost") || host.startsWith("127.")
      ? "http"
      : "https";
  const base = host ? `${protocol}://${host}` : "";
  const returnPath =
    data.returnPath && data.returnPath.startsWith("/")
      ? data.returnPath
      : "/";
  const successUrl = `${base}${returnPath}?booking=success&ref=${booking.reference}`;
  const cancelUrl = `${base}${returnPath}?booking=cancelled&ref=${booking.reference}`;

  const provider = getPaymentProvider(data.provider);
  const result = await provider.createPayment({
    booking: {
      id: booking.id,
      reference: booking.reference,
      organizationId: organization.id,
      amount: booking.total,
      currency: booking.currency,
      guestEmail: booking.guest_email,
      description: `Booking ${booking.reference}`,
    },
    rentalPaymentId: payment.id,
    account: {
      cryptoNetwork: resolved.account?.crypto_network ?? null,
      cryptoWalletAddress: resolved.account?.crypto_wallet_address ?? null,
      instructions: resolved.row.instructions,
    },
    successUrl,
    cancelUrl,
  });

  if (result.kind === "unavailable") {
    await admin
      .from("rental_payments")
      .update({ status: "failed" })
      .eq("id", payment.id);
    return { ok: false, error: result.message };
  }

  await admin.from("payment_transactions").insert({
    organization_id: organization.id,
    rental_payment_id: payment.id,
    booking_id: booking.id,
    provider: data.provider,
    kind: "charge",
    status: result.kind === "redirect" ? "processing" : "pending",
    amount: booking.total,
    currency: booking.currency,
    provider_transaction_id: result.reference,
  });

  if (result.kind === "redirect") {
    await admin
      .from("rental_payments")
      .update({ status: "processing", provider_reference: result.reference })
      .eq("id", payment.id);
    return { ok: true, kind: "redirect", url: result.url };
  }

  await admin
    .from("rental_payments")
    .update({ provider_reference: result.reference })
    .eq("id", payment.id);
  return {
    ok: true,
    kind: "instructions",
    heading: result.instructions.heading,
    lines: result.instructions.lines,
  };
}

// ---- Dashboard ------------------------------------------------

/** Гард: активная организация + право payments.manage. */
async function requirePaymentAccess(): Promise<
  | { ok: true; organizationId: string; userId: string }
  | { ok: false; error: string }
> {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false, error: "No active organization." };
  }
  if (!hasPermission(context, "payments.manage")) {
    return {
      ok: false,
      error: "You do not have permission to manage payments.",
    };
  }
  return {
    ok: true,
    organizationId: context.organization.id,
    userId: context.user.id,
  };
}

/** Сохраняет настройки платёжного провайдера организации. */
export async function savePaymentProvider(
  input: SavePaymentProviderInput,
): Promise<ActionResult> {
  const parsed = savePaymentProviderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid provider settings." };
  }
  const data = parsed.data;
  const access = await requirePaymentAccess();
  if (!access.ok) {
    return access;
  }

  const admin = createAdminClient();
  const { data: providerRow, error } = await admin
    .from("payment_providers")
    .upsert(
      {
        organization_id: access.organizationId,
        provider: data.provider,
        display_name: data.displayName,
        is_enabled: data.isEnabled,
        mode: data.mode,
        instructions: data.instructions,
      },
      { onConflict: "organization_id,provider" },
    )
    .select("id")
    .single();
  if (error || !providerRow) {
    return { ok: false, error: "Could not save the provider." };
  }

  // Аккаунт провайдера — публичные реквизиты (один на провайдера).
  const accountFields = {
    organization_id: access.organizationId,
    payment_provider_id: providerRow.id,
    label: data.displayName,
    publishable_key: data.publishableKey,
    crypto_network: data.cryptoNetwork,
    crypto_wallet_address: data.cryptoWalletAddress,
  };
  const { data: existingAccount } = await admin
    .from("payment_accounts")
    .select("id")
    .eq("payment_provider_id", providerRow.id)
    .limit(1)
    .maybeSingle();
  if (existingAccount) {
    await admin
      .from("payment_accounts")
      .update(accountFields)
      .eq("id", existingAccount.id);
  } else {
    await admin.from("payment_accounts").insert(accountFields);
  }

  revalidatePath("/dashboard/bookings");
  return { ok: true };
}

/** Фиксирует платёж, полученный вне сайта (crypto / банк / наличные). */
export async function recordManualPayment(
  input: RecordManualPaymentInput,
): Promise<ActionResult> {
  const parsed = recordManualPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid payment details." };
  }
  const data = parsed.data;
  // Ручная запись — только для офлайн-способов: банк/наличные (manual) или
  // crypto. Запись под stripe/paypal без реального гейтвея исказила бы отчёты.
  if (data.provider !== "manual" && data.provider !== "crypto") {
    return {
      ok: false,
      error: "Offline payments can only be recorded as bank transfer or crypto.",
    };
  }
  const access = await requirePaymentAccess();
  if (!access.ok) {
    return access;
  }

  const admin = createAdminClient();
  const { data: booking } = await admin
    .from("rental_bookings")
    .select("id, currency, total")
    .eq("id", data.bookingId)
    .eq("organization_id", access.organizationId)
    .maybeSingle();
  if (!booking) {
    return { ok: false, error: "Booking not found." };
  }

  const { data: payment } = await admin
    .from("rental_payments")
    .insert({
      organization_id: access.organizationId,
      booking_id: booking.id,
      provider: data.provider,
      purpose: "booking_total",
      status: "succeeded",
      amount: data.amount,
      currency: booking.currency,
      provider_reference: data.reference,
      is_manual: true,
      paid_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (!payment) {
    return { ok: false, error: "Could not record the payment." };
  }

  await admin.from("payment_transactions").insert({
    organization_id: access.organizationId,
    rental_payment_id: payment.id,
    booking_id: booking.id,
    provider: data.provider,
    kind: "charge",
    status: "succeeded",
    amount: data.amount,
    currency: booking.currency,
    provider_transaction_id: data.reference,
  });

  // Сверяем сумму всех успешных платежей с total брони: полная оплата →
  // подтверждаем (markBookingPaid блокирует даты), иначе помечаем
  // «частично оплачено» — форму доплаты не прячем (она скрыта только при
  // payment_status === "paid"), даты не блокируем.
  const { data: paidRows } = await admin
    .from("rental_payments")
    .select("amount")
    .eq("organization_id", access.organizationId)
    .eq("booking_id", booking.id)
    .eq("status", "succeeded");
  const totalPaid = (paidRows ?? []).reduce(
    (sum, row) => sum + (row.amount ?? 0),
    0,
  );
  if (totalPaid + 0.01 >= booking.total) {
    await markBookingPaid(access.organizationId, booking.id);
  } else {
    await admin
      .from("rental_bookings")
      .update({ payment_status: "partially_paid" })
      .eq("id", booking.id)
      .eq("organization_id", access.organizationId);
  }

  revalidatePath("/dashboard/bookings");
  revalidatePath(`/dashboard/bookings/${booking.id}`);
  return { ok: true };
}

/** Оформляет возврат средств по бронированию. */
export async function issueRefund(
  input: IssueRefundInput,
): Promise<ActionResult> {
  const parsed = issueRefundSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid refund details." };
  }
  const data = parsed.data;
  const access = await requirePaymentAccess();
  if (!access.ok) {
    return access;
  }

  const admin = createAdminClient();
  const { data: booking } = await admin
    .from("rental_bookings")
    .select("id")
    .eq("id", data.bookingId)
    .eq("organization_id", access.organizationId)
    .maybeSingle();
  if (!booking) {
    return { ok: false, error: "Booking not found." };
  }

  const { data: payment } = await admin
    .from("rental_payments")
    .select("*")
    .eq("booking_id", booking.id)
    .eq("status", "succeeded")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!payment) {
    return { ok: false, error: "No completed payment to refund." };
  }

  // Сумма уже оформленных возвратов по этому платежу (всё, кроме проваленных):
  // несколько частичных возвратов вместе не должны превысить captured-сумму.
  const { data: priorRefunds } = await admin
    .from("refunds")
    .select("amount")
    .eq("rental_payment_id", payment.id)
    .neq("status", "failed");
  const alreadyRefunded = (priorRefunds ?? []).reduce(
    (sum, row) => sum + row.amount,
    0,
  );
  const refundable = payment.amount - alreadyRefunded;
  if (data.amount > refundable) {
    return {
      ok: false,
      error:
        refundable > 0
          ? `Refund exceeds the refundable amount (${refundable.toFixed(2)} ${payment.currency} left).`
          : "This payment has already been fully refunded.",
    };
  }

  const { data: charge } = await admin
    .from("payment_transactions")
    .select("provider_transaction_id")
    .eq("rental_payment_id", payment.id)
    .eq("kind", "charge")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const provider = getPaymentProvider(payment.provider);
  const result = await provider.refundPayment({
    providerTransactionId: charge?.provider_transaction_id ?? null,
    providerReference: payment.provider_reference,
    amount: data.amount,
    currency: payment.currency,
  });

  let refundStatus: RefundStatus;
  let txStatus: PaymentStatus;
  let providerRefundId: string | null = null;
  if (result.ok) {
    refundStatus = result.status === "succeeded" ? "succeeded" : "processing";
    txStatus = result.status === "succeeded" ? "succeeded" : "pending";
    providerRefundId = result.providerRefundId;
  } else if (result.manual) {
    // Возврат оформляется вручную — фиксируем как ожидающий.
    refundStatus = "pending";
    txStatus = "pending";
  } else {
    return { ok: false, error: result.message };
  }

  const { data: refundTx } = await admin
    .from("payment_transactions")
    .insert({
      organization_id: access.organizationId,
      rental_payment_id: payment.id,
      booking_id: booking.id,
      provider: payment.provider,
      kind: "refund",
      status: txStatus,
      amount: data.amount,
      currency: payment.currency,
      provider_transaction_id: providerRefundId,
    })
    .select("id")
    .single();

  await admin.from("refunds").insert({
    organization_id: access.organizationId,
    booking_id: booking.id,
    rental_payment_id: payment.id,
    payment_transaction_id: refundTx?.id ?? null,
    provider: payment.provider,
    amount: data.amount,
    currency: payment.currency,
    status: refundStatus,
    reason: data.reason,
    provider_refund_id: providerRefundId,
    created_by: access.userId,
  });

  if (refundStatus === "succeeded") {
    // Полный возврат — когда этот возврат вместе с ранее оформленными
    // покрывает всю captured-сумму (а не только относительно одного платежа).
    const fullRefund = alreadyRefunded + data.amount >= payment.amount;
    await admin
      .from("rental_bookings")
      .update({
        payment_status: fullRefund ? "refunded" : "partially_refunded",
      })
      .eq("id", booking.id);
    if (fullRefund) {
      await admin
        .from("rental_payments")
        .update({ status: "refunded" })
        .eq("id", payment.id);
    }
  }

  revalidatePath("/dashboard/bookings");
  revalidatePath(`/dashboard/bookings/${booking.id}`);
  return { ok: true };
}
