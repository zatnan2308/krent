import { NextResponse } from "next/server";

import { processStripeWebhook } from "@/features/payments/webhook";

export const dynamic = "force-dynamic";

/**
 * Вебхук Stripe для событий оплаты. Подпись проверяется внутри
 * processStripeWebhook по STRIPE_WEBHOOK_SECRET; при успешной оплате
 * бронирование подтверждается, а даты календаря блокируются.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");
  const result = await processStripeWebhook(rawBody, signature);
  return new NextResponse(result.body, { status: result.status });
}
