import { createAdminClient } from "@/lib/supabase/server";

export interface BellItem {
  id: string;
  eventType: string;
  createdAt: string;
  status: string;
  recipient: string;
}

/** Последние 10 уведомлений, адресованных текущему пользователю. */
export async function listRecentNotificationsForBell(
  organizationId: string,
  userId: string,
): Promise<BellItem[]> {
  const admin = createAdminClient();
  // Фильтр по recipient_user_id — иначе колокол показывает уведомления других
  // получателей организации (включая их email — PII).
  const { data } = await admin
    .from("notification_logs")
    .select("id, event_type, created_at, status, recipient_email")
    .eq("organization_id", organizationId)
    .eq("recipient_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);
  return (data ?? []).map((row) => ({
    id: row.id,
    eventType: row.event_type,
    createdAt: row.created_at,
    status: row.status,
    recipient: row.recipient_email,
  }));
}
