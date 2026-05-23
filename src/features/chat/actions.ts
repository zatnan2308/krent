"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/server/auth";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

import { classifyAttachment } from "./constants";
import { notifyNewMessage } from "./notifications";
import {
  sendMessageSchema,
  startConversationSchema,
  type ActionResult,
  type SendMessageInput,
  type StartConversationInput,
  type StartConversationResult,
} from "./schema";

type AdminClient = ReturnType<typeof createAdminClient>;

const ATTACHMENTS_BUCKET = "chat-attachments";
const DASHBOARD_MESSAGES = "/dashboard/messages";
const PORTAL_MESSAGES = "/portal/messages";

/** Проверяет, что пользователь — участник диалога (через RLS). */
async function isParticipant(
  conversationId: string,
  userId: string,
): Promise<boolean> {
  const supabase = createClient();
  const { data } = await supabase
    .from("chat_participants")
    .select("id")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  return data !== null;
}

/** Обновляет last_message_at диалога и отметку прочтения отправителя. */
async function touchConversation(
  admin: AdminClient,
  conversationId: string,
  organizationId: string,
  userId: string,
): Promise<void> {
  const now = new Date().toISOString();
  await admin
    .from("chat_conversations")
    .update({ last_message_at: now })
    .eq("id", conversationId);
  await admin.from("message_reads").upsert(
    {
      conversation_id: conversationId,
      organization_id: organizationId,
      user_id: userId,
      last_read_at: now,
    },
    { onConflict: "conversation_id,user_id" },
  );
}

/** Создаёт диалог с клиентом портала и добавляет участников. */
export async function startConversation(
  input: StartConversationInput,
): Promise<StartConversationResult> {
  const parsed = startConversationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid conversation data." };
  }
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false, error: "No active organization." };
  }
  if (!hasPermission(context, "crm.view")) {
    return {
      ok: false,
      error: "You do not have permission to start conversations.",
    };
  }

  const data = parsed.data;
  const admin = createAdminClient();
  const organizationId = context.organization.id;

  const { data: portalAccount } = await admin
    .from("portal_accounts")
    .select("*")
    .eq("id", data.portalAccountId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (!portalAccount) {
    return { ok: false, error: "Client not found." };
  }
  if (portalAccount.status !== "active" || !portalAccount.user_id) {
    return {
      ok: false,
      error: "The client has not activated their portal yet.",
    };
  }

  let propertyId: string | null = null;
  if (data.propertyId) {
    const { data: property } = await admin
      .from("properties")
      .select("id")
      .eq("id", data.propertyId)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (property) {
      propertyId = property.id;
    }
  }

  const conversationType =
    portalAccount.portal_type === "seller"
      ? "seller_agent"
      : portalAccount.portal_type === "guest"
        ? "guest_manager"
        : "buyer_agent";

  const { data: conversation, error } = await admin
    .from("chat_conversations")
    .insert({
      organization_id: organizationId,
      property_id: propertyId,
      type: conversationType,
      created_by: context.user.id,
    })
    .select("id")
    .single();
  if (error || !conversation) {
    return { ok: false, error: "Could not start the conversation." };
  }

  const { error: participantsError } = await admin
    .from("chat_participants")
    .insert([
      {
        conversation_id: conversation.id,
        organization_id: organizationId,
        user_id: context.user.id,
      },
      {
        conversation_id: conversation.id,
        organization_id: organizationId,
        user_id: portalAccount.user_id,
      },
    ]);
  if (participantsError) {
    return { ok: false, error: "Could not add conversation participants." };
  }

  revalidatePath(DASHBOARD_MESSAGES);
  return { ok: true, conversationId: conversation.id };
}

/** Отправляет текстовое сообщение в диалог. */
export async function sendTextMessage(
  input: SendMessageInput,
): Promise<ActionResult> {
  const parsed = sendMessageSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "The message cannot be empty." };
  }
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Not authenticated." };
  }
  const data = parsed.data;
  if (!(await isParticipant(data.conversationId, user.id))) {
    return { ok: false, error: "You are not part of this conversation." };
  }

  const admin = createAdminClient();
  const { data: conversation } = await admin
    .from("chat_conversations")
    .select("organization_id")
    .eq("id", data.conversationId)
    .maybeSingle();
  if (!conversation) {
    return { ok: false, error: "Conversation not found." };
  }

  const { data: message, error } = await admin
    .from("chat_messages")
    .insert({
      conversation_id: data.conversationId,
      organization_id: conversation.organization_id,
      sender_id: user.id,
      message: data.message,
      message_type: "text",
    })
    .select("id")
    .single();
  if (error || !message) {
    return { ok: false, error: "Could not send the message." };
  }

  await touchConversation(
    admin,
    data.conversationId,
    conversation.organization_id,
    user.id,
  );
  await notifyNewMessage({
    organizationId: conversation.organization_id,
    conversationId: data.conversationId,
    messageId: message.id,
    senderId: user.id,
  });

  revalidatePath(DASHBOARD_MESSAGES);
  revalidatePath(PORTAL_MESSAGES);
  return { ok: true };
}

/** Отправляет сообщение с файлом-вложением. */
export async function sendFileMessage(
  formData: FormData,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Not authenticated." };
  }

  const conversationId = formData.get("conversationId");
  const file = formData.get("file");
  if (typeof conversationId !== "string" || !(file instanceof File)) {
    return { ok: false, error: "Invalid upload." };
  }
  if (!(await isParticipant(conversationId, user.id))) {
    return { ok: false, error: "You are not part of this conversation." };
  }

  const rule = classifyAttachment(file.type);
  if (!rule) {
    return { ok: false, error: "This file type is not supported." };
  }
  if (file.size === 0 || file.size > rule.maxSize) {
    return {
      ok: false,
      error: `File is too large. Maximum ${Math.round(
        rule.maxSize / 1024 / 1024,
      )}MB for this file type.`,
    };
  }

  const admin = createAdminClient();
  const { data: conversation } = await admin
    .from("chat_conversations")
    .select("organization_id")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conversation) {
    return { ok: false, error: "Conversation not found." };
  }

  const extension =
    file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ||
    "bin";
  const storagePath = `${conversation.organization_id}/${conversationId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await admin.storage
    .from(ATTACHMENTS_BUCKET)
    .upload(storagePath, await file.arrayBuffer(), {
      contentType: file.type,
      upsert: false,
    });
  if (uploadError) {
    return { ok: false, error: "Could not upload the file." };
  }

  const { data: message, error: messageError } = await admin
    .from("chat_messages")
    .insert({
      conversation_id: conversationId,
      organization_id: conversation.organization_id,
      sender_id: user.id,
      message: "",
      message_type: "file",
    })
    .select("id")
    .single();
  if (messageError || !message) {
    await admin.storage.from(ATTACHMENTS_BUCKET).remove([storagePath]);
    return { ok: false, error: "Could not send the file." };
  }

  const { error: attachmentError } = await admin
    .from("chat_attachments")
    .insert({
      message_id: message.id,
      conversation_id: conversationId,
      organization_id: conversation.organization_id,
      file_url: storagePath,
      file_name: file.name,
      file_type: rule.type,
      file_size: file.size,
      mime_type: file.type,
    });
  if (attachmentError) {
    return { ok: false, error: "Could not save the attachment." };
  }

  await touchConversation(
    admin,
    conversationId,
    conversation.organization_id,
    user.id,
  );
  await notifyNewMessage({
    organizationId: conversation.organization_id,
    conversationId,
    messageId: message.id,
    senderId: user.id,
  });

  revalidatePath(DASHBOARD_MESSAGES);
  revalidatePath(PORTAL_MESSAGES);
  return { ok: true };
}

/** Отмечает диалог прочитанным для текущего пользователя. */
export async function markConversationRead(
  conversationId: string,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Not authenticated." };
  }

  const supabase = createClient();
  const { data: conversation } = await supabase
    .from("chat_conversations")
    .select("organization_id")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conversation) {
    return { ok: false, error: "Conversation not found." };
  }

  const { error } = await supabase.from("message_reads").upsert(
    {
      conversation_id: conversationId,
      organization_id: conversation.organization_id,
      user_id: user.id,
      last_read_at: new Date().toISOString(),
    },
    { onConflict: "conversation_id,user_id" },
  );
  if (error) {
    return { ok: false, error: "Could not update read status." };
  }
  return { ok: true };
}
