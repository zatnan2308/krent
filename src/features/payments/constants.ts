import type {
  PaymentProviderType,
  PaymentStatus,
  RefundStatus,
} from "./types";

export const PAYMENT_PROVIDER_LABELS: Record<PaymentProviderType, string> = {
  stripe: "Stripe",
  paypal: "PayPal",
  crypto: "Crypto",
  manual: "Manual / bank transfer",
};

export const PAYMENT_PROVIDER_DESCRIPTIONS: Record<
  PaymentProviderType,
  string
> = {
  stripe: "Card payments via Stripe Checkout.",
  paypal: "PayPal checkout with create/capture and webhook verification.",
  crypto:
    "Crypto transfer with on-screen wallet instructions and admin confirmation.",
  manual: "Bank transfer or cash, recorded by staff.",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  succeeded: "Succeeded",
  failed: "Failed",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export const REFUND_STATUS_LABELS: Record<RefundStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  succeeded: "Succeeded",
  failed: "Failed",
};

/** Провайдеры, доступные для настройки в dashboard. */
export const CONFIGURABLE_PROVIDERS: PaymentProviderType[] = [
  "stripe",
  "paypal",
  "crypto",
  "manual",
];
