import { getServerEnv } from "@/lib/env";

import type { PaymentProviderType } from "./types";

/**
 * Резолв конфигурации платёжных провайдеров из окружения.
 *
 * Секреты (secret key, webhook secret, client secret) доступны только
 * на сервере — getServerEnv() бросает ошибку при вызове из браузера.
 * В БД секреты не хранятся.
 */

export interface StripeRuntimeConfig {
  secretKey: string;
  webhookSecret: string | null;
}

export interface PayPalRuntimeConfig {
  clientId: string;
  clientSecret: string;
  webhookId: string | null;
  mode: "sandbox" | "live";
  apiBase: string;
}

/** Конфигурация Stripe или null, если секрет не задан в окружении. */
export function getStripeConfig(): StripeRuntimeConfig | null {
  const env = getServerEnv();
  if (!env.STRIPE_SECRET_KEY) {
    return null;
  }
  return {
    secretKey: env.STRIPE_SECRET_KEY,
    webhookSecret: env.STRIPE_WEBHOOK_SECRET ?? null,
  };
}

/** Конфигурация PayPal или null, если credentials не заданы. */
export function getPayPalConfig(): PayPalRuntimeConfig | null {
  const env = getServerEnv();
  if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) {
    return null;
  }
  const mode = env.PAYPAL_MODE ?? "sandbox";
  return {
    clientId: env.PAYPAL_CLIENT_ID,
    clientSecret: env.PAYPAL_CLIENT_SECRET,
    webhookId: env.PAYPAL_WEBHOOK_ID ?? null,
    mode,
    apiBase:
      mode === "live"
        ? "https://api-m.paypal.com"
        : "https://api-m.sandbox.paypal.com",
  };
}

/**
 * Готов ли провайдер к реальному приёму платежей.
 *  - stripe: требует секрет в окружении;
 *  - crypto / manual: ручной поток, готов всегда;
 *  - paypal: адаптер-плейсхолдер — онлайн-оплата пока не запущена.
 */
export function isProviderOperational(type: PaymentProviderType): boolean {
  switch (type) {
    case "stripe":
      return getStripeConfig() !== null;
    case "crypto":
    case "manual":
      return true;
    case "paypal":
      return getPayPalConfig() !== null;
    default:
      return false;
  }
}
