"use client";

import * as React from "react";

import { track } from "@/features/analytics/track";
import { getBookingQuote, requestBooking } from "@/features/bookings/actions";
import type { BookingQuote } from "@/features/bookings/pricing";
import { todayIso } from "@/features/rental-calendar/date-utils";
import { startBookingPayment } from "@/features/payments/actions";
import type { PaymentProviderType } from "@/features/payments/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface PaymentOptionView {
  provider: PaymentProviderType;
  displayName: string;
}

interface BookingWidgetProps {
  propertyId: string;
  locale: string;
  guestCapacity: number | null;
  paymentOptions: PaymentOptionView[];
}

/** Форматирует сумму; при неизвестной валюте — простой fallback. */
function money(amount: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function toInt(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : fallback;
}

/**
 * Виджет бронирования на странице rental-объекта: выбор дат и гостей,
 * расчёт стоимости на сервере, отправка запроса на бронирование и
 * последующая онлайн-оплата (Stripe redirect / crypto instructions).
 */
export function BookingWidget({
  propertyId,
  locale,
  guestCapacity,
  paymentOptions,
}: BookingWidgetProps) {
  const [checkIn, setCheckIn] = React.useState("");
  const [checkOut, setCheckOut] = React.useState("");
  const [adults, setAdults] = React.useState("2");
  const [children, setChildren] = React.useState("0");
  const [pets, setPets] = React.useState("0");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [message, setMessage] = React.useState("");

  const [quote, setQuote] = React.useState<BookingQuote | null>(null);
  const [issues, setIssues] = React.useState<string[]>([]);
  const [available, setAvailable] = React.useState(true);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [done, setDone] = React.useState<{
    reference: string;
    bookingId: string;
  } | null>(null);
  const [instructions, setInstructions] = React.useState<{
    heading: string;
    lines: string[];
  } | null>(null);
  const [paidBanner, setPaidBanner] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    if (params.get("booking") === "success") {
      setPaidBanner("paid");
      track("payment_completed", {
        entityType: "property",
        entityId: propertyId,
        data: { reference: params.get("ref") },
      });
    } else if (params.get("booking") === "cancelled") {
      setPaidBanner("cancelled");
    }
  }, [propertyId]);

  /** Сброс расчёта при изменении входных данных. */
  function resetQuote() {
    setQuote(null);
    setIssues([]);
    setError(null);
  }

  async function handleQuote() {
    if (!checkIn || !checkOut) {
      setError("Select check-in and check-out dates.");
      return;
    }
    setPending(true);
    setError(null);
    const result = await getBookingQuote({
      propertyId,
      checkIn,
      checkOut,
      adults: toInt(adults, 1),
      children: toInt(children, 0),
      pets: toInt(pets, 0),
      promoCode: null,
    });
    setPending(false);
    if (result.ok) {
      setQuote(result.quote);
      setIssues(result.issues);
      setAvailable(result.available);
    } else {
      setQuote(null);
      setError(result.error);
    }
  }

  async function handleRequest() {
    if (!name.trim() || !email.trim()) {
      setError("Enter your name and email.");
      return;
    }
    track("booking_started", {
      entityType: "property",
      entityId: propertyId,
    });
    setPending(true);
    setError(null);
    const result = await requestBooking({
      propertyId,
      checkIn,
      checkOut,
      adults: toInt(adults, 1),
      children: toInt(children, 0),
      pets: toInt(pets, 0),
      promoCode: null,
      guestName: name.trim(),
      guestEmail: email.trim(),
      guestPhone: phone.trim() || null,
      guestMessage: message.trim() || null,
      locale,
      returnPath:
        typeof window !== "undefined" ? window.location.pathname : null,
    });
    setPending(false);
    if (result.ok) {
      track("booking_completed", {
        entityType: "property",
        entityId: propertyId,
        data: {
          bookingId: result.bookingId,
          reference: result.reference,
        },
      });
      setDone({ reference: result.reference, bookingId: result.bookingId });
    } else {
      setError(result.error);
    }
  }

  async function handlePay(provider: PaymentProviderType) {
    if (!done) {
      return;
    }
    track("payment_started", {
      entityType: "property",
      entityId: propertyId,
      data: { provider, bookingId: done.bookingId },
    });
    setPending(true);
    setError(null);
    const result = await startBookingPayment({
      bookingId: done.bookingId,
      provider,
      returnPath:
        typeof window !== "undefined" ? window.location.pathname : null,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (result.kind === "redirect") {
      window.location.href = result.url;
      return;
    }
    setInstructions({ heading: result.heading, lines: result.lines });
  }

  // ---- Состояние: бронирование создано ------------------------
  if (done) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <p className="font-medium">Booking request sent.</p>
          <p className="mt-1">
            Reference <span className="font-semibold">{done.reference}</span>.
            We&apos;ll email you a confirmation shortly.
          </p>
        </div>

        {instructions ? (
          <div className="rounded-md border p-3 text-sm">
            <p className="font-medium">{instructions.heading}</p>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              {instructions.lines.map((line, index) => (
                <li key={index} className="break-words">
                  {line}
                </li>
              ))}
            </ul>
          </div>
        ) : paymentOptions.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Pay now to confirm instantly</p>
            {paymentOptions.map((option) => (
              <Button
                key={option.provider}
                type="button"
                className="w-full"
                variant="outline"
                disabled={pending}
                onClick={() => handlePay(option.provider)}
              >
                Pay with {option.displayName}
              </Button>
            ))}
          </div>
        ) : null}

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  const canRequest = quote !== null && available && issues.length === 0;

  // ---- Состояние: форма бронирования --------------------------
  return (
    <div className="space-y-4">
      {paidBanner === "paid" ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          Payment received — your booking is being confirmed.
        </div>
      ) : null}
      {paidBanner === "cancelled" ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Payment was cancelled. You can try again below.
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label htmlFor="bw-checkin" className="text-xs font-medium">
            Check-in
          </label>
          <Input
            id="bw-checkin"
            type="date"
            min={todayIso()}
            value={checkIn}
            onChange={(event) => {
              setCheckIn(event.target.value);
              resetQuote();
            }}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="bw-checkout" className="text-xs font-medium">
            Check-out
          </label>
          <Input
            id="bw-checkout"
            type="date"
            min={checkIn || todayIso()}
            value={checkOut}
            onChange={(event) => {
              setCheckOut(event.target.value);
              resetQuote();
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <label htmlFor="bw-adults" className="text-xs font-medium">
            Adults
          </label>
          <Input
            id="bw-adults"
            type="number"
            min={1}
            value={adults}
            onChange={(event) => {
              setAdults(event.target.value);
              resetQuote();
            }}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="bw-children" className="text-xs font-medium">
            Children
          </label>
          <Input
            id="bw-children"
            type="number"
            min={0}
            value={children}
            onChange={(event) => {
              setChildren(event.target.value);
              resetQuote();
            }}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="bw-pets" className="text-xs font-medium">
            Pets
          </label>
          <Input
            id="bw-pets"
            type="number"
            min={0}
            value={pets}
            onChange={(event) => {
              setPets(event.target.value);
              resetQuote();
            }}
          />
        </div>
      </div>
      {guestCapacity !== null ? (
        <p className="text-xs text-muted-foreground">
          This property accommodates up to {guestCapacity} guest(s).
        </p>
      ) : null}

      {quote === null ? (
        <Button
          type="button"
          className="w-full"
          disabled={pending}
          onClick={handleQuote}
        >
          {pending ? "Checking..." : "Check price & availability"}
        </Button>
      ) : null}

      {issues.length > 0 ? (
        <ul className="space-y-1 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          {issues.map((issue, index) => (
            <li key={index}>{issue}</li>
          ))}
        </ul>
      ) : null}

      {quote ? (
        <div className="space-y-1.5 rounded-md border p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {money(quote.averageNightly, quote.currency, locale)} ×{" "}
              {quote.nights} night(s)
            </span>
            <span>{money(quote.subtotal, quote.currency, locale)}</span>
          </div>
          {quote.cleaningFee > 0 ? (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cleaning fee</span>
              <span>{money(quote.cleaningFee, quote.currency, locale)}</span>
            </div>
          ) : null}
          {quote.taxes > 0 ? (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Taxes</span>
              <span>{money(quote.taxes, quote.currency, locale)}</span>
            </div>
          ) : null}
          {quote.discount > 0 ? (
            <div className="flex justify-between text-emerald-700">
              <span>Discount</span>
              <span>-{money(quote.discount, quote.currency, locale)}</span>
            </div>
          ) : null}
          <div className="flex justify-between border-t pt-1.5 font-semibold">
            <span>Total</span>
            <span>{money(quote.total, quote.currency, locale)}</span>
          </div>
          {quote.securityDeposit > 0 ? (
            <p className="pt-1 text-xs text-muted-foreground">
              Refundable security deposit:{" "}
              {money(quote.securityDeposit, quote.currency, locale)}
            </p>
          ) : null}
        </div>
      ) : null}

      {canRequest ? (
        <div className="space-y-2 border-t pt-3">
          <Input
            value={name}
            placeholder="Full name"
            aria-label="Full name"
            onChange={(event) => setName(event.target.value)}
          />
          <Input
            type="email"
            value={email}
            placeholder="Email"
            aria-label="Email"
            onChange={(event) => setEmail(event.target.value)}
          />
          <Input
            type="tel"
            value={phone}
            placeholder="Phone (optional)"
            aria-label="Phone"
            onChange={(event) => setPhone(event.target.value)}
          />
          <Textarea
            rows={3}
            value={message}
            placeholder="Message (optional)"
            aria-label="Message"
            onChange={(event) => setMessage(event.target.value)}
          />
          <Button
            type="button"
            className="w-full"
            disabled={pending}
            onClick={handleRequest}
          >
            {pending ? "Sending..." : "Send booking request"}
          </Button>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
