import Stripe from "stripe";

import { getStripeConfig } from "../config";
import type {
  HandleWebhookResult,
  PaymentProvider,
} from "../provider";

/** Результат вебхука «не прошёл проверку». */
function unverified(error: string): HandleWebhookResult {
  return {
    verified: false,
    eventId: null,
    eventType: null,
    outcome: "ignored",
    providerReference: null,
    metadata: {},
    error,
  };
}

/** Приводит metadata Stripe к Record<string, string>. */
function readMetadata(
  metadata: Stripe.Metadata | null,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(metadata ?? {})) {
    if (typeof value === "string") {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Адаптер Stripe (basic): оплата через Stripe Checkout, проверка сессии,
 * возврат средств и разбор вебхуков. Секрет берётся из окружения; если
 * он не задан — методы возвращают «недоступно», не ломая поток.
 */
export function createStripeProvider(): PaymentProvider {
  const config = getStripeConfig();
  const client = config ? new Stripe(config.secretKey) : null;

  return {
    type: "stripe",

    async createPayment(input) {
      if (!client) {
        return {
          kind: "unavailable",
          message: "Stripe is not configured on this site.",
        };
      }
      try {
        const session = await client.checkout.sessions.create({
          mode: "payment",
          line_items: [
            {
              quantity: 1,
              price_data: {
                currency: input.booking.currency.toLowerCase(),
                unit_amount: Math.round(input.booking.amount * 100),
                product_data: { name: input.booking.description },
              },
            },
          ],
          success_url: input.successUrl,
          cancel_url: input.cancelUrl,
          client_reference_id: input.booking.id,
          customer_email: input.booking.guestEmail ?? undefined,
          metadata: {
            booking_id: input.booking.id,
            rental_payment_id: input.rentalPaymentId,
            organization_id: input.booking.organizationId,
          },
        });
        if (!session.url) {
          return {
            kind: "unavailable",
            message: "Stripe did not return a checkout URL.",
          };
        }
        return { kind: "redirect", url: session.url, reference: session.id };
      } catch (error) {
        return {
          kind: "unavailable",
          message:
            error instanceof Error
              ? error.message
              : "Stripe checkout could not be created.",
        };
      }
    },

    async verifyPayment(input) {
      if (!client) {
        return { status: "unsupported" };
      }
      try {
        const session = await client.checkout.sessions.retrieve(
          input.reference,
        );
        if (session.payment_status === "paid") {
          return { status: "succeeded" };
        }
        if (session.status === "expired") {
          return { status: "failed" };
        }
        return { status: "pending" };
      } catch {
        return { status: "failed" };
      }
    },

    async refundPayment(input) {
      if (!client) {
        return {
          ok: false,
          manual: false,
          message: "Stripe is not configured.",
        };
      }
      try {
        let paymentIntentId = input.providerTransactionId;
        // Из checkout-сессии достаём связанный PaymentIntent.
        if (!paymentIntentId && input.providerReference) {
          const session = await client.checkout.sessions.retrieve(
            input.providerReference,
          );
          paymentIntentId =
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : (session.payment_intent?.id ?? null);
        }
        if (!paymentIntentId) {
          return {
            ok: false,
            manual: false,
            message: "No Stripe payment found to refund.",
          };
        }
        const refund = await client.refunds.create({
          payment_intent: paymentIntentId,
          amount: Math.round(input.amount * 100),
        });
        return {
          ok: true,
          providerRefundId: refund.id,
          status: refund.status === "succeeded" ? "succeeded" : "pending",
        };
      } catch (error) {
        return {
          ok: false,
          manual: false,
          message:
            error instanceof Error
              ? error.message
              : "Stripe refund failed.",
        };
      }
    },

    async handleWebhook(input) {
      if (!client || !config?.webhookSecret) {
        return unverified("Stripe webhook is not configured.");
      }
      if (!input.signature) {
        return unverified("Missing Stripe signature header.");
      }
      let event: Stripe.Event;
      try {
        event = client.webhooks.constructEvent(
          input.rawBody,
          input.signature,
          config.webhookSecret,
        );
      } catch (error) {
        return unverified(
          error instanceof Error
            ? error.message
            : "Stripe signature verification failed.",
        );
      }

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        return {
          verified: true,
          eventId: event.id,
          eventType: event.type,
          outcome:
            session.payment_status === "paid"
              ? "payment_succeeded"
              : "ignored",
          providerReference: session.id,
          metadata: readMetadata(session.metadata),
          error: null,
        };
      }
      if (
        event.type === "checkout.session.expired" ||
        event.type === "checkout.session.async_payment_failed"
      ) {
        const session = event.data.object as Stripe.Checkout.Session;
        return {
          verified: true,
          eventId: event.id,
          eventType: event.type,
          outcome: "payment_failed",
          providerReference: session.id,
          metadata: readMetadata(session.metadata),
          error: null,
        };
      }

      // Прочие события подтверждаем, но не обрабатываем.
      return {
        verified: true,
        eventId: event.id,
        eventType: event.type,
        outcome: "ignored",
        providerReference: null,
        metadata: {},
        error: null,
      };
    },
  };
}
