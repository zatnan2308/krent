import { createAdminClient } from "@/lib/supabase/server";

/** Возвращает количество непрочитанных сообщений по всем conversation. */
export async function getUnreadMessagesCount(
  organizationId: string,
  userId: string,
): Promise<number> {
  const admin = createAdminClient();
  // Считаем только по диалогам, где пользователь — участник (иначе счётчик
  // показывает чужие переписки той же организации).
  const { data: participantRows } = await admin
    .from("chat_participants")
    .select("conversation_id")
    .eq("organization_id", organizationId)
    .eq("user_id", userId);
  const convIds = (participantRows ?? []).map((r) => r.conversation_id);
  if (convIds.length === 0) return 0;
  const { data: conversations } = await admin
    .from("chat_conversations")
    .select("id, last_message_at")
    .in("id", convIds);
  if (!conversations || conversations.length === 0) return 0;
  const { data: reads } = await admin
    .from("message_reads")
    .select("conversation_id, last_read_at")
    .eq("organization_id", organizationId)
    .eq("user_id", userId);
  const readMap = new Map<string, string>(
    (reads ?? []).map((r) => [r.conversation_id, r.last_read_at]),
  );
  let unread = 0;
  for (const conv of conversations) {
    if (!conv.last_message_at) continue;
    const lastRead = readMap.get(conv.id);
    if (!lastRead || lastRead < conv.last_message_at) {
      unread += 1;
    }
  }
  return unread;
}
