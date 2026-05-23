import { NextResponse } from "next/server";

import { runIcalSync } from "@/features/rental-calendar/sync";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Плейсхолдер планового синка iCal. Предназначен для вызова по расписанию
 * (Vercel Cron). Защищён секретом CRON_SECRET; без него маршрут неактивен.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const admin = createAdminClient();
  const { data: sources } = await admin
    .from("ical_import_sources")
    .select("id")
    .eq("is_active", true);
  const list = sources ?? [];

  let synced = 0;
  for (const source of list) {
    const result = await runIcalSync(source.id);
    if (result.ok) {
      synced += 1;
    }
  }

  return NextResponse.json({ ok: true, total: list.length, synced });
}
