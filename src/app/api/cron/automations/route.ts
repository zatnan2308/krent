import { NextResponse } from "next/server";

import { processDueAutomationRuns } from "@/features/automations/engine";

export const dynamic = "force-dynamic";

/**
 * Плановый тик движка автоматизаций: продвигает «созревшие» run'ы на шаг.
 * Предназначен для вызова по расписанию (Vercel Cron / внешний планировщик).
 * Защищён секретом CRON_SECRET; без него маршрут неактивен.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const result = await processDueAutomationRuns();
  return NextResponse.json({ ok: true, processed: result.processed });
}
