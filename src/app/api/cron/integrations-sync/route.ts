import { NextResponse } from "next/server";

import { runIntegrationsSync } from "@/features/integrations/sync";

export const dynamic = "force-dynamic";

/**
 * Плановый синк интеграций (Search Console и пр.). Предназначен для вызова
 * по расписанию (Vercel Cron / внешний планировщик). Защищён CRON_SECRET.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const summary = await runIntegrationsSync();
  return NextResponse.json({ ok: true, ...summary });
}
