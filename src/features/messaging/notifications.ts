import {
  createNotificationEvent,
  resolveUserRecipient,
} from "@/features/notifications/dispatcher";
import { createAdminClient } from "@/lib/supabase/server";

import { CHANNEL_LABELS } from "./channels";
import type { MessagingChannel } from "./types";

interface InboundChannelMessageEvent {
  organizationId: string;
  conversationId: string;
  messageId: string;
  channel: MessagingChannel;
}

/**
 * Уведомляет ответственного сотрудника о новом входящем из канала
 * (WhatsApp/Telegram/Messenger): запись в audit_logs + письмо и строка в
 * колоколе через Notification Center. Получатель выбирается по убыванию:
 * назначенный агент диалога → агент связанного лида → первый активный
 * сотрудник организации. Best-effort — сбой не должен ломать приём вебхука.
 */
export async function notifyInboundChannelMessage(
  event: InboundChannelMessageEvent,
): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: conversation } = await admin
      .from("messaging_conversations")
      .select("assigned_agent_id, lead_id, contact_id")
      .eq("id", event.conversationId)
      .maybeSingle();
    if (!conversation) {
      return;
    }

    let agentId: string | null = conversation.assigned_agent_id;
    if (!agentId && conversation.lead_id) {
      const { data: lead } = await admin
        .from("leads")
        .select("assigned_agent_id")
        .eq("id", conversation.lead_id)
        .maybeSingle();
      agentId = lead?.assigned_agent_id ?? null;
    }
    if (!agentId) {
      const { data: member } = await admin
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", event.organizationId)
        .eq("status", "active")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      agentId = member?.user_id ?? null;
    }
    if (!agentId) {
      return;
    }

    const recipient = await resolveUserRecipient(agentId);
    if (!recipient) {
      return;
    }

    let contactName = "a contact";
    if (conversation.contact_id) {
      const { data: contact } = await admin
        .from("contacts")
        .select("full_name")
        .eq("id", conversation.contact_id)
        .maybeSingle();
      contactName = contact?.full_name?.trim() || contactName;
    }

    await admin.from("audit_logs").insert({
      organization_id: event.organizationId,
      action: "messaging.inbound",
      entity_type: "messaging_conversation",
      entity_id: event.conversationId,
      metadata: { channel: event.channel, message_id: event.messageId },
    });

    await createNotificationEvent({
      organizationId: event.organizationId,
      eventType: "messaging.inbound",
      entityType: "messaging_conversation",
      entityId: event.conversationId,
      recipients: [
        { email: recipient.email, name: recipient.name, userId: agentId },
      ],
      variables: {
        contact_name: contactName,
        channel_label: CHANNEL_LABELS[event.channel],
      },
    });
  } catch {
    // Уведомление не должно ломать приём сообщения.
  }
}
