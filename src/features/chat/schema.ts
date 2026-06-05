import { z } from "zod";

/** Старт диалога с клиентом портала. */
export const startConversationSchema = z.object({
  portalAccountId: z.guid(),
  propertyId: z.guid().nullable(),
});
export type StartConversationInput = z.infer<typeof startConversationSchema>;

/** Старт внутреннего диалога сотрудника с коллегами (staff-to-staff). */
export const startInternalConversationSchema = z.object({
  memberIds: z.array(z.guid()).min(1).max(20),
  title: z.string().trim().max(120).nullable(),
});
export type StartInternalConversationInput = z.infer<
  typeof startInternalConversationSchema
>;

/** Отправка текстового сообщения. */
export const sendMessageSchema = z.object({
  conversationId: z.guid(),
  message: z.string().min(1).max(4000),
});
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export type ActionResult = { ok: true } | { ok: false; error: string };

export type StartConversationResult =
  | { ok: true; conversationId: string }
  | { ok: false; error: string };
