import { markBookingPaid } from "@/features/bookings/fulfillment";
import { createAdminClient } from "@/lib/supabase/server";

import { getPaymentProvider, type HandleWebhookResult } from "./provider";

type Admin = ReturnType<typeof createAdminClient>;

export interface WebhookResponse {
  status: number;
  body: string;
}

/** Находит платёж по metadata или по reference провайдера. */
async function findPayment(
  admin: Admin,
  result: HandleWebhookResult,
): Promise<{
  id: string;
  organization_id: string;
  booking_id: string;
} | null> {
  const paymentId = result.metadata.rental_payment_id;
  if (paymentId) {
    const { data } = await admin
      .from("rental_payments")
      .select("*")
      .eq("id", paymentId)
      .maybeSingle();
    if (data) {
      return data;
    }
  }
  if (result.providerReference) {
    const { data } = await admin
      .from("rental_payments")
      .select("*")
      .eq("provider_reference", result.providerReference)
      .maybeSingle();
    if (data) {
      return data;
    }
  }
  return null;
}

/**
 * Обрабатывает вебхук Stripe: проверяет подпись, при успешной оплате
 * отмечает платёж и бронирование оплаченными (даты блокируются). Все
 * downstream-операции идемпотентны — повторная доставка безопасна.
 */
export async function processStripeWebhook(
  rawBody: string,
  signature: string | null,
): Promise<WebhookResponse> {
  return processProviderWebhook("stripe", { rawBody, signature });
}

/**
 * Обрабатывает вебхук PayPal: верифицирует подпись через REST API,
 * отмечает платёж и бронирование оплаченными при успехе.
 */
export async function processPayPalWebhook(
  rawBody: string,
  signature: string | null,
): Promise<WebhookResponse> {
  return processProviderWebhook("paypal", { rawBody, signature });
}

/** Общий обработчик webhook'ов для любого провайдера. */
async function processProviderWebhook(
  type: "stripe" | "paypal",
  input: { rawBody: string; signature: string | null },
): Promise<WebhookResponse> {
  const provider = getPaymentProvider(type);
  const result = await provider.handleWebhook(input);

  if (!result.verified) {
    return {
      status: 400,
      body: result.error ?? "Webhook could not be verified.",
    };
  }

  const admin = createAdminClient();
  let organizationId: string | null = result.metadata.organization_id ?? null;
  let processingError: string | null = null;

  if (result.outcome === "payment_succeeded") {
    const payment = await findPayment(admin, result);
    if (!payment) {
      processingError = "Matching payment was not found.";
    } else {
      organizationId = payment.organization_id;
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
    }
  } else if (result.outcome === "payment_failed") {
    const payment = await findPayment(admin, result);
    if (payment) {
      organizationId = payment.organization_id;
      await admin
        .from("rental_payments")
        .update({ status: "failed" })
        .eq("id", payment.id);
      await admin
        .from("payment_transactions")
        .update({ status: "failed" })
        .eq("rental_payment_id", payment.id)
        .eq("kind", "charge");
    }
  }

  await admin.from("payment_webhooks").insert({
    organization_id: organizationId,
    provider: type,
    event_type: result.eventType,
    external_event_id: result.eventId,
    payload: {
      outcome: result.outcome,
      provider_reference: result.providerReference,
    },
    signature_verified: true,
    processed: processingError === null,
    processing_error: processingError,
  });

  return { status: 200, body: processingError ?? "ok" };
}
