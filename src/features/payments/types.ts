import type { Enums, Tables } from "@/types/database";

// ---- Алиасы строк таблиц платежей ------------------------------
export type PaymentProviderRow = Tables<"payment_providers">;
export type PaymentAccount = Tables<"payment_accounts">;
export type RentalPayment = Tables<"rental_payments">;
export type PaymentTransaction = Tables<"payment_transactions">;
export type PaymentWebhook = Tables<"payment_webhooks">;
export type Refund = Tables<"refunds">;

// ---- Алиасы enum-типов ----------------------------------------
export type PaymentProviderType = Enums<"payment_provider_type">;
export type PaymentProviderMode = Enums<"payment_provider_mode">;
export type PaymentStatus = Enums<"payment_status">;
export type PaymentPurpose = Enums<"payment_purpose">;
export type PaymentTransactionKind = Enums<"payment_transaction_kind">;
export type RefundStatus = Enums<"refund_status">;
