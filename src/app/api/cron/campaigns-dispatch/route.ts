import { NextResponse } from "next/server";

import { sendCampaign } from "@/features/campaigns/send";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Cron-эндпоинт отправки запланированных кампаний. Vercel Cron вызывает по
 * расписанию; защищён CRON_SECRET. Берёт кампании со status='scheduled' и
 * наступившим scheduled_at и отправляет их (sendCampaign атомарно переводит в
 * 'sending' и не отправляет уже отправленные).
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const { data: due } = await admin
    .from("campaigns")
    .select("id, organization_id")
    .eq("status", "scheduled")
    .lte("scheduled_at", nowIso);
  const list = due ?? [];

  let sent = 0;
  for (const campaign of list) {
    const result = await sendCampaign(campaign.organization_id, campaign.id);
    if (result.ok) {
      sent += 1;
    }
  }

  return NextResponse.json({ ok: true, total: list.length, sent });
}
