import { NextResponse } from "next/server";

import {
  createNotificationEvent,
  resolveUserRecipient,
} from "@/features/notifications/dispatcher";
import { todayIso } from "@/features/rental-calendar/date-utils";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Cron-эндпоинт напоминаний о задачах. Раз в день рассылает назначенным
 * агентам письма по открытым задачам с наступившим (или просроченным) сроком.
 * Защищён CRON_SECRET.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const admin = createAdminClient();
  const today = todayIso();
  const { data: tasks } = await admin
    .from("tasks")
    .select("id, title, due_date, assigned_agent_id, organization_id")
    .eq("status", "open")
    .not("due_date", "is", null)
    .lte("due_date", today)
    .not("assigned_agent_id", "is", null);
  const list = tasks ?? [];

  let sent = 0;
  for (const task of list) {
    if (!task.assigned_agent_id) {
      continue;
    }
    const recipient = await resolveUserRecipient(task.assigned_agent_id);
    if (!recipient) {
      continue;
    }
    await createNotificationEvent({
      organizationId: task.organization_id,
      eventType: "task.reminder",
      entityType: "task",
      entityId: task.id,
      recipients: [
        {
          email: recipient.email,
          name: recipient.name,
          userId: task.assigned_agent_id,
        },
      ],
      variables: {
        task_title: task.title,
        due_date: task.due_date ?? "",
      },
    });
    sent += 1;
  }

  return NextResponse.json({ ok: true, total: list.length, sent });
}
