import { z } from "zod";

const PORTAL_TYPE_VALUES = ["buyer", "seller", "guest"] as const;

/** Приглашение контакта в клиентский портал. */
export const invitePortalSchema = z.object({
  contactId: z.guid(),
  portalType: z.enum(PORTAL_TYPE_VALUES),
  propertyId: z.guid().nullable(),
});
export type InvitePortalInput = z.infer<typeof invitePortalSchema>;

/** Результат server action. */
export type ActionResult = { ok: true } | { ok: false; error: string };
