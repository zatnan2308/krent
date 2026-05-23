import { NextResponse, type NextRequest } from "next/server";

import { runWebhookRetryBatch } from "@/features/agency-api/webhooks";
import { getServerEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Cron-эндпоинт повторной доставки webhook'ов. Vercel Cron вызывает
 * раз в минуту, защищён CRON_SECRET. Подбирает события со status =
 * 'pending' и наступившим next_attempt_at.
 */
export async function GET(request: NextRequest) {
  const env = getServerEnv();
  const provided =
    request.headers.get("x-cron-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    null;
  if (!env.CRON_SECRET || provided !== env.CRON_SECRET) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const result = await runWebhookRetryBatch(50);
  return NextResponse.json(result);
}
