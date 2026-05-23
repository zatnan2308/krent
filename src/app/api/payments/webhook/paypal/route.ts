import { NextResponse } from "next/server";

import { processPayPalWebhook } from "@/features/payments/webhook";

export const dynamic = "force-dynamic";

/**
 * PayPal webhook endpoint.
 * Подпись валидируется через REST `/v1/notifications/verify-webhook-signature`;
 * для этого PayPal-провайдер обращается к API с PAYPAL_WEBHOOK_ID. Заголовки
 * подписи передаются адаптеру в JSON-сериализованном виде через поле
 * `signature`, чтобы переиспользовать общий интерфейс PaymentProvider.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signaturePayload = JSON.stringify({
    "paypal-auth-algo": request.headers.get("paypal-auth-algo"),
    "paypal-cert-url": request.headers.get("paypal-cert-url"),
    "paypal-transmission-id": request.headers.get("paypal-transmission-id"),
    "paypal-transmission-sig": request.headers.get("paypal-transmission-sig"),
    "paypal-transmission-time": request.headers.get("paypal-transmission-time"),
  });
  const result = await processPayPalWebhook(rawBody, signaturePayload);
  return new NextResponse(result.body, { status: result.status });
}
