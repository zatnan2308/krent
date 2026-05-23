import { createManualProvider } from "./providers/crypto";
import { createPayPalProvider } from "./providers/paypal";
import { createStripeProvider } from "./providers/stripe";
import type { PaymentProviderType } from "./types";

/**
 * Абстракция платёжного провайдера. Любой провайдер реализует один
 * интерфейс: создание платежа, проверка, возврат, разбор вебхука. Это
 * позволяет добавлять провайдеров (Stripe, PayPal, Crypto, …) без
 * изменения вызывающего кода бронирований.
 */

/** Данные бронирования, необходимые для инициации платежа. */
export interface PaymentBookingInfo {
  id: string;
  reference: string;
  organizationId: string;
  amount: number;
  currency: string;
  guestEmail: string | null;
  description: string;
}

/** Публичные реквизиты провайдера (из payment_accounts). */
export interface ProviderAccountInfo {
  cryptoNetwork: string | null;
  cryptoWalletAddress: string | null;
  instructions: string | null;
}

export interface CreatePaymentInput {
  booking: PaymentBookingInfo;
  rentalPaymentId: string;
  account: ProviderAccountInfo;
  successUrl: string;
  cancelUrl: string;
}

/** Инструкция ручной оплаты (crypto / bank transfer). */
export interface ManualPaymentInstructions {
  heading: string;
  lines: string[];
}

export type CreatePaymentResult =
  | { kind: "redirect"; url: string; reference: string }
  | {
      kind: "instructions";
      instructions: ManualPaymentInstructions;
      reference: string | null;
    }
  | { kind: "unavailable"; message: string };

export interface VerifyPaymentInput {
  reference: string;
}

export type VerifyPaymentResult = {
  status: "succeeded" | "pending" | "failed" | "unsupported";
};

export interface RefundPaymentInput {
  providerTransactionId: string | null;
  providerReference: string | null;
  amount: number;
  currency: string;
}

export type RefundPaymentResult =
  | {
      ok: true;
      providerRefundId: string | null;
      status: "succeeded" | "pending";
    }
  | { ok: false; manual: boolean; message: string };

export interface HandleWebhookInput {
  rawBody: string;
  signature: string | null;
}

/** Нормализованный итог разбора вебхука провайдера. */
export interface HandleWebhookResult {
  verified: boolean;
  eventId: string | null;
  eventType: string | null;
  outcome: "payment_succeeded" | "payment_failed" | "ignored";
  providerReference: string | null;
  metadata: Record<string, string>;
  error: string | null;
}

/** Единый интерфейс платёжного провайдера. */
export interface PaymentProvider {
  readonly type: PaymentProviderType;
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult>;
  refundPayment(input: RefundPaymentInput): Promise<RefundPaymentResult>;
  handleWebhook(input: HandleWebhookInput): Promise<HandleWebhookResult>;
}

/** Возвращает адаптер провайдера по его типу. */
export function getPaymentProvider(
  type: PaymentProviderType,
): PaymentProvider {
  switch (type) {
    case "stripe":
      return createStripeProvider();
    case "paypal":
      return createPayPalProvider();
    case "crypto":
    case "manual":
      return createManualProvider(type);
    default:
      return createManualProvider("manual");
  }
}
