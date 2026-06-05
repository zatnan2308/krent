"use server";

import { createClient } from "@/lib/supabase/server";
import { requireOrganizationContext } from "@/server/organization-context";

/**
 * Отметка последнего просмотра уведомлений текущего пользователя в активной
 * организации (для бейджа непрочитанного у колокола). Серверная, кросс-девайс.
 */
export async function getNotificationsLastSeen(): Promise<string | null> {
  const context = await requireOrganizationContext();
  if (!context.organization) return null;
  const supabase = createClient();
  const { data } = await supabase
    .from("notification_reads")
    .select("last_seen_at")
    .eq("user_id", context.user.id)
    .eq("organization_id", context.organization.id)
    .maybeSingle();
  return data?.last_seen_at ?? null;
}

/** Помечает уведомления просмотренными (now) для текущего пользователя+орг. */
export async function markNotificationsSeen(): Promise<void> {
  const context = await requireOrganizationContext();
  if (!context.organization) return;
  const supabase = createClient();
  await supabase.from("notification_reads").upsert(
    {
      user_id: context.user.id,
      organization_id: context.organization.id,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "user_id,organization_id" },
  );
}
