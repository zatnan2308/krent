"use client";

import * as React from "react";

import { sendBookingWhatsAppConfirmation } from "@/features/messaging/actions";
import { Button } from "@/components/ui/button";

/** Кнопка «отправить гостю подтверждение брони в WhatsApp» (шаблон). */
export function BookingWhatsAppButton({ bookingId }: { bookingId: string }) {
  const [pending, setPending] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSend() {
    setPending(true);
    setError(null);
    const result = await sendBookingWhatsAppConfirmation(bookingId);
    setPending(false);
    if (result.ok) {
      setDone(true);
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="space-y-1">
      <Button
        size="sm"
        variant="outline"
        disabled={pending || done}
        onClick={handleSend}
      >
        {done
          ? "Confirmation sent"
          : pending
            ? "Sending…"
            : "Send WhatsApp confirmation"}
      </Button>
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
