"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
  cancelBookingAction,
  completeBookingAction,
  confirmBookingAction,
} from "@/features/bookings/actions";
import type {
  BookingPaymentStatus,
  BookingStatus,
} from "@/features/bookings/types";
import { issueRefund, recordManualPayment } from "@/features/payments/actions";
import { PAYMENT_PROVIDER_LABELS } from "@/features/payments/constants";
import type { PaymentProviderType } from "@/features/payments/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/provider";

const FIELD_CLASS =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

// Офлайн-запись доступна только для ручных способов: stripe/paypal
// проводятся через онлайн-гейтвей, и recordManualPayment их отклоняет.
const MANUAL_PROVIDERS: PaymentProviderType[] = ["manual", "crypto"];

interface BookingManagerProps {
  bookingId: string;
  status: BookingStatus;
  paymentStatus: BookingPaymentStatus;
  total: number;
  canManageBookings: boolean;
  canManagePayments: boolean;
}

/** Панель управления бронированием в dashboard: статус, оплата, возврат. */
export function BookingManager({
  bookingId,
  status,
  paymentStatus,
  total,
  canManageBookings,
  canManagePayments,
}: BookingManagerProps) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.dashBookings;
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [payAmount, setPayAmount] = React.useState(String(total));
  const [payProvider, setPayProvider] =
    React.useState<PaymentProviderType>("manual");
  const [payReference, setPayReference] = React.useState("");

  const [refundAmount, setRefundAmount] = React.useState(String(total));
  const [refundReason, setRefundReason] = React.useState("");

  async function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setPending(true);
    setError(null);
    const result = await action();
    setPending(false);
    if (result.ok) {
      router.refresh();
    } else {
      setError(result.error ?? t.actionFailed);
    }
  }

  const isPaid = paymentStatus === "paid";
  const showConfirm = canManageBookings && status === "pending";
  const showCancel =
    canManageBookings && (status === "pending" || status === "confirmed");
  const showComplete = canManageBookings && status === "confirmed";
  const showRecordPayment =
    canManagePayments &&
    !isPaid &&
    status !== "cancelled" &&
    status !== "completed";
  const showRefund = canManagePayments && isPaid;

  return (
    <div className="space-y-4">
      {(showConfirm || showCancel || showComplete) && (
        <div className="flex flex-wrap gap-2">
          {showConfirm ? (
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={() =>
                run(() => confirmBookingAction(bookingId))
              }
            >
              {t.confirmBooking}
            </Button>
          ) : null}
          {showComplete ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() =>
                run(() => completeBookingAction(bookingId))
              }
            >
              {t.markCompleted}
            </Button>
          ) : null}
          {showCancel ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="text-destructive"
              disabled={pending}
              onClick={() => run(() => cancelBookingAction(bookingId))}
            >
              {t.cancelBooking}
            </Button>
          ) : null}
        </div>
      )}

      {showRecordPayment ? (
        <div className="space-y-2 rounded-md border p-3">
          <p className="text-sm font-medium">{t.recordPaymentTitle}</p>
          <div className="grid gap-2 sm:grid-cols-3">
            <Input
              type="number"
              min={0}
              step="any"
              value={payAmount}
              aria-label={t.paymentAmountAria}
              onChange={(event) => setPayAmount(event.target.value)}
            />
            <select
              className={FIELD_CLASS}
              value={payProvider}
              aria-label={t.paymentMethodAria}
              onChange={(event) =>
                setPayProvider(event.target.value as PaymentProviderType)
              }
            >
              {MANUAL_PROVIDERS.map((provider) => (
                <option key={provider} value={provider}>
                  {PAYMENT_PROVIDER_LABELS[provider]}
                </option>
              ))}
            </select>
            <Input
              value={payReference}
              placeholder={t.referenceOptional}
              aria-label={t.paymentReferenceAria}
              onChange={(event) => setPayReference(event.target.value)}
            />
          </div>
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() =>
              run(() =>
                recordManualPayment({
                  bookingId,
                  provider: payProvider,
                  amount: Number(payAmount) || 0,
                  reference: payReference.trim() || null,
                }),
              )
            }
          >
            {t.recordPayment}
          </Button>
        </div>
      ) : null}

      {showRefund ? (
        <div className="space-y-2 rounded-md border p-3">
          <p className="text-sm font-medium">{t.issueRefundTitle}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              type="number"
              min={0}
              step="any"
              value={refundAmount}
              aria-label={t.refundAmountAria}
              onChange={(event) => setRefundAmount(event.target.value)}
            />
            <Input
              value={refundReason}
              placeholder={t.reasonOptional}
              aria-label={t.refundReasonAria}
              onChange={(event) => setRefundReason(event.target.value)}
            />
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              run(() =>
                issueRefund({
                  bookingId,
                  amount: Number(refundAmount) || 0,
                  reason: refundReason.trim() || null,
                }),
              )
            }
          >
            {t.issueRefund}
          </Button>
        </div>
      ) : null}

      {!showConfirm &&
      !showCancel &&
      !showComplete &&
      !showRecordPayment &&
      !showRefund ? (
        <p className="text-sm text-muted-foreground">
          {t.noActions}
        </p>
      ) : null}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
