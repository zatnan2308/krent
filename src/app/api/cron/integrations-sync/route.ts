import { NextResponse } from "next/server";

import { processPendingOfflineConversions } from "@/features/integrations/offline-conversions";
import { runIntegrationsSync } from "@/features/integrations/sync";

export const dynamic = "force-dynamic";

/**
 * Плановый синк интеграций: подтягивает отчёты (Search Console и пр.) и
 * выгружает накопленные оффлайн-конверсии. Предназначен для вызова по
 * расписанию (Vercel Cron / внешний планировщик). Защищён CRON_SECRET.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const summary = await runIntegrationsSync();
  const conversions = await processPendingOfflineConversions();
  return NextResponse.json({ ok: true, reports: summary, conversions });
}
