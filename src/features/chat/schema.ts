import { z } from "zod";

/** Старт диалога с клиентом портала. */
export const startConversationSchema = z.object({
  portalAccountId: z.uuid(),
  propertyId: z.uuid().nullable(),
});
export type StartConversationInput = z.infer<typeof startConversationSchema>;

/** Отправка текстового сообщения. */
export const sendMessageSchema = z.object({
  conversationId: z.uuid(),
  message: z.string().min(1).max(4000),
});
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export type ActionResult = { ok: true } | { ok: false; error: string };

export type StartConversationResult =
  | { ok: true; conversationId: string }
  | { ok: false; error: string };
