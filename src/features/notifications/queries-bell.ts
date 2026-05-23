import { createAdminClient } from "@/lib/supabase/server";

export interface BellItem {
  id: string;
  eventType: string;
  createdAt: string;
  status: string;
  recipient: string;
}

/** Последние 10 уведомлений для текущей организации (notification_logs). */
export async function listRecentNotificationsForBell(
  organizationId: string,
): Promise<BellItem[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("notification_logs")
    .select("id, event_type, created_at, status, recipient_email")
    .eq("organization_id", organizationId)
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
