import { createAdminClient } from "@/lib/supabase/server";

import { isProviderOperational } from "./config";
import { CONFIGURABLE_PROVIDERS } from "./constants";
import type {
  PaymentAccount,
  PaymentProviderRow,
  PaymentProviderType,
  PaymentTransaction,
  RentalPayment,
  Refund,
} from "./types";

/** Провайдер платежей с привязанным аккаунтом. */
export interface ResolvedProvider {
  row: PaymentProviderRow;
  account: PaymentAccount | null;
}

/** Резолвит провайдера организации по типу вместе с его аккаунтом. */
export async function resolveProvider(
  organizationId: string,
  provider: PaymentProviderType,
): Promise<ResolvedProvider | null> {
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("payment_providers")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("provider", provider)
    .maybeSingle();
  if (!row) {
    return null;
  }
  const { data: account } = await admin
    .from("payment_accounts")
    .select("*")
    .eq("payment_provider_id", row.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return { row, account };
}

/** Платёжный способ, доступный гостю в booking widget. */
export interface PaymentOption {
  provider: PaymentProviderType;
  displayName: string;
}

/**
 * Платёжные способы для публичного виджета: включённые провайдеры
 * организации, реально готовые к приёму оплаты.
 */
export async function getEnabledPaymentOptions(
  organizationId: string,
): Promise<PaymentOption[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("payment_providers")
    .select("provider, display_name")
    .eq("organization_id", organizationId)
    .eq("is_enabled", true);
  return (data ?? [])
    .filter((row) => isProviderOperational(row.provider))
    .map((row) => ({ provider: row.provider, displayName: row.display_name }));
}

/** Настройка одного провайдера для dashboard (строка может отсутствовать). */
export interface ProviderSetting {
  provider: PaymentProviderType;
  row: PaymentProviderRow | null;
  account: PaymentAccount | null;
  operational: boolean;
}

/** Все провайдеры организации для страницы настроек платежей. */
export async function getPaymentSettings(
  organizationId: string,
): Promise<ProviderSetting[]> {
  const admin = createAdminClient();
  const [providersResult, accountsResult] = await Promise.all([
    admin
      .from("payment_providers")
      .select("*")
      .eq("organization_id", organizationId),
    admin
      .from("payment_accounts")
      .select("*")
      .eq("organization_id", organizationId),
  ]);
  const rows = providersResult.data ?? [];
  const accounts = accountsResult.data ?? [];

  return CONFIGURABLE_PROVIDERS.map((provider) => {
    const row = rows.find((item) => item.provider === provider) ?? null;
    const account = row
      ? (accounts.find((item) => item.payment_provider_id === row.id) ?? null)
      : null;
    return {
      provider,
      row,
      account,
      operational: isProviderOperational(provider),
    };
  });
}

/** Платёжные данные одного бронирования для страницы деталей. */
export interface BookingPaymentData {
  payments: RentalPayment[];
  transactions: PaymentTransaction[];
  refunds: Refund[];
}

/** Платежи, транзакции и возвраты бронирования. */
export async function getBookingPaymentData(
  organizationId: string,
  bookingId: string,
): Promise<BookingPaymentData> {
  const admin = createAdminClient();
  const [payments, transactions, refunds] = await Promise.all([
    admin
      .from("rental_payments")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: false }),
    admin
      .from("payment_transactions")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: false }),
    admin
      .from("refunds")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: false }),
  ]);
  return {
    payments: payments.data ?? [],
    transactions: transactions.data ?? [],
    refunds: refunds.data ?? [],
  };
}
