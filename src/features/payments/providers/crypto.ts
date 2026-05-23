import type { PaymentProvider } from "../provider";
import type { PaymentProviderType } from "../types";

/**
 * Адаптер ручной оплаты: криптоперевод и offline-платежи (банковский
 * перевод, наличные). createPayment отдаёт инструкции для гостя —
 * платёж остаётся pending, пока менеджер не подтвердит поступление
 * средств вручную в dashboard. Чистая точка расширения под будущий
 * автоматический crypto-провайдер (verifyPayment по транзакции сети).
 */
export function createManualProvider(
  type: PaymentProviderType,
): PaymentProvider {
  return {
    type,

    async createPayment(input) {
      const lines: string[] = [];
      if (type === "crypto") {
        lines.push(
          `Network: ${input.account.cryptoNetwork ?? "see instructions below"}`,
        );
        if (input.account.cryptoWalletAddress) {
          lines.push(`Wallet address: ${input.account.cryptoWalletAddress}`);
        }
      }
      lines.push(
        `Amount: ${input.booking.amount} ${input.booking.currency}`,
      );
      lines.push(`Payment reference: ${input.booking.reference}`);
      if (input.account.instructions) {
        lines.push(input.account.instructions);
      }
      lines.push(
        "Your booking is confirmed once our team verifies the payment.",
      );

      return {
        kind: "instructions",
        instructions: {
          heading:
            type === "crypto"
              ? "Crypto payment instructions"
              : "Payment instructions",
          lines,
        },
        reference: input.booking.reference,
      };
    },

    async verifyPayment() {
      // Поступление средств подтверждает менеджер вручную.
      return { status: "pending" };
    },

    async refundPayment() {
      return {
        ok: false,
        manual: true,
        message: "This payment is refunded manually.",
      };
    },

    async handleWebhook() {
      return {
        verified: false,
        eventId: null,
        eventType: null,
        outcome: "ignored",
        providerReference: null,
        metadata: {},
        error: "Manual payments do not use webhooks.",
      };
    },
  };
}
