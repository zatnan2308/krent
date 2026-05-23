import { z } from "zod";

const PROVIDER_VALUES = ["stripe", "paypal", "crypto", "manual"] as const;
const MODE_VALUES = ["test", "live"] as const;

/** Запуск онлайн-оплаты бронирования (booking widget). */
export const startPaymentSchema = z.object({
  bookingId: z.uuid(),
  provider: z.enum(PROVIDER_VALUES),
  returnPath: z.string().max(2000).nullable(),
});
export type StartPaymentInput = z.infer<typeof startPaymentSchema>;

/** Настройки платёжного провайдера организации (dashboard). */
export const savePaymentProviderSchema = z.object({
  provider: z.enum(PROVIDER_VALUES),
  displayName: z.string().min(1).max(120),
  isEnabled: z.boolean(),
  mode: z.enum(MODE_VALUES),
  publishableKey: z.string().max(300).nullable(),
  cryptoNetwork: z.string().max(120).nullable(),
  cryptoWalletAddress: z.string().max(300).nullable(),
  instructions: z.string().max(2000).nullable(),
});
export type SavePaymentProviderInput = z.infer<
  typeof savePaymentProviderSchema
>;

/** Возврат средств по бронированию (dashboard). */
export const issueRefundSchema = z.object({
  bookingId: z.uuid(),
  amount: z.number().positive(),
  reason: z.string().max(500).nullable(),
});
export type IssueRefundInput = z.infer<typeof issueRefundSchema>;

/** Ручная фиксация платежа по бронированию (dashboard). */
export const recordManualPaymentSchema = z.object({
  bookingId: z.uuid(),
  provider: z.enum(PROVIDER_VALUES),
  amount: z.number().positive(),
  reference: z.string().max(200).nullable(),
});
export type RecordManualPaymentInput = z.infer<
  typeof recordManualPaymentSchema
>;

/** Результат server action. */
export type ActionResult = { ok: true } | { ok: false; error: string };

/** Результат запуска оплаты бронирования. */
export type StartPaymentResult =
  | { ok: true; kind: "redirect"; url: string }
  | { ok: true; kind: "instructions"; heading: string; lines: string[] }
  | { ok: false; error: string };
