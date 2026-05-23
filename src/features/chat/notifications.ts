import {
  createNotificationEvent,
  resolveUserRecipient,
  type NotificationRecipient,
} from "@/features/notifications/dispatcher";
import { createAdminClient } from "@/lib/supabase/server";

interface NewMessageEvent {
  organizationId: string;
  conversationId: string;
  messageId: string;
  senderId: string;
}

type Admin = ReturnType<typeof createAdminClient>;

/** Рассылает уведомления о новом сообщении остальным участникам диалога. */
async function dispatchMessageEmails(
  admin: Admin,
  event: NewMessageEvent,
): Promise<void> {
  const { data: participants } = await admin
    .from("chat_participants")
    .select("user_id")
    .eq("conversation_id", event.conversationId);
  const others = (participants ?? [])
    .map((row) => row.user_id)
    .filter((id) => id !== event.senderId);
  if (others.length === 0) {
    return;
  }

  const sender = await resolveUserRecipient(event.senderId);
  const senderName = sender?.name ?? "your contact";

  const recipients: NotificationRecipient[] = [];
  for (const userId of others) {
    const recipient = await resolveUserRecipient(userId);
    if (recipient) {
      recipients.push({
        email: recipient.email,
        name: recipient.name,
        userId,
      });
    }
  }
  if (recipients.length === 0) {
    return;
  }

  await createNotificationEvent({
    organizationId: event.organizationId,
    eventType: "chat.message",
    entityType: "chat_message",
    entityId: event.messageId,
    recipients,
    variables: { agent_name: senderName },
  });
}

/**
 * Уведомление о новом сообщении. Фиксирует событие в audit_logs и
 * запускает письма участникам диалога через Notification Center.
 */
export async function notifyNewMessage(event: NewMessageEvent): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("audit_logs").insert({
      organization_id: event.organizationId,
      action: "chat.message_sent",
      entity_type: "chat_message",
      entity_id: event.messageId,
      user_id: event.senderId,
      metadata: {
        conversation_id: event.conversationId,
        notification: "dispatched",
      },
    });
    await dispatchMessageEmails(admin, event);
  } catch {
    // Логирование и письма не должны ломать отправку сообщения.
  }
}
