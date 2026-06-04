"use client";

import * as React from "react";

import { track } from "@/features/analytics/track";
import { getBookingQuote, requestBooking } from "@/features/bookings/actions";
import type { BookingQuote } from "@/features/bookings/pricing";

interface Props {
  propertyId: string;
  locale: string;
  nightly: number;
  currency: string;
  cleaningFee: number | null;
  minNights: number;
  maxGuests: number | null;
  rating?: number | null;
  reviews?: number | null;
  /** Занятые ISO-даты — дизейблятся в календаре. */
  bookedDates?: string[];
}

const SERVICE_RATE = 0.06;
const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmtShort(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Editorial booking-виджет (Airbnb-style): встроенный календарь-range,
 *  гости, расчёт цены и заявка на бронь через существующий requestBooking. */
export function BookingWidgetEditorial({
  propertyId,
  locale,
  nightly,
  currency,
  cleaningFee,
  minNights,
  maxGuests,
  rating,
  reviews,
  bookedDates = [],
}: Props) {
  const [start, setStart] = React.useState<Date | null>(null);
  const [end, setEnd] = React.useState<Date | null>(null);
  const [guests, setGuests] = React.useState(2);
  const [open, setOpen] = React.useState(true);
  const [stage, setStage] = React.useState<"pick" | "details">("pick");
  const [quote, setQuote] = React.useState<BookingQuote | null>(null);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState<string | null>(null);

  const money = React.useCallback(
    (n: number) => {
      try {
        return new Intl.NumberFormat(locale, {
          style: "currency",
          currency,
          maximumFractionDigits: 0,
        }).format(Math.round(n));
      } catch {
        return `${Math.round(n).toLocaleString("en-US")} ${currency}`;
      }
    },
    [locale, currency],
  );

  const nights = start && end ? Math.round((+end - +start) / 86400000) : 0;
  const sub = nights * nightly;
  const cleaning = cleaningFee ?? 0;
  const service = Math.round(sub * SERVICE_RATE);
  const estTotal = sub ? sub + cleaning + service : 0;
  const cap = maxGuests ?? 12;

  function pick(d: Date) {
    setError(null);
    setStage("pick");
    setQuote(null);
    if (!start || (start && end)) {
      setStart(d);
      setEnd(null);
    } else if (d > start) {
      setEnd(d);
    } else {
      setStart(d);
      setEnd(null);
    }
  }

  async function handleReserve() {
    if (!start || !end || nights < minNights) {
      setError(`Minimum stay is ${minNights} night${minNights > 1 ? "s" : ""}.`);
      return;
    }
    setPending(true);
    setError(null);
    track("booking_dates_selected", {
      entityType: "property",
      entityId: propertyId,
    });
    const result = await getBookingQuote({
      propertyId,
      checkIn: isoDate(start),
      checkOut: isoDate(end),
      adults: guests,
      children: 0,
      pets: 0,
      promoCode: null,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (!result.available || result.issues.length > 0) {
      setError(result.issues[0] ?? "These dates are not available.");
      return;
    }
    setQuote(result.quote);
    setStage("details");
    track("booking_started", { entityType: "property", entityId: propertyId });
  }

  async function handleSend() {
    if (!start || !end) return;
    if (!name.trim() || !email.trim()) {
      setError("Enter your name and email.");
      return;
    }
    setPending(true);
    setError(null);
    const result = await requestBooking({
      propertyId,
      checkIn: isoDate(start),
      checkOut: isoDate(end),
      adults: guests,
      children: 0,
      pets: 0,
      promoCode: null,
      guestName: name.trim(),
      guestEmail: email.trim(),
      guestPhone: phone.trim() || null,
      guestMessage: null,
      locale,
      returnPath:
        typeof window !== "undefined" ? window.location.pathname : null,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    track("booking_completed", {
      entityType: "property",
      entityId: propertyId,
      data: { bookingId: result.bookingId, reference: result.reference },
    });
    setDone(result.reference);
  }

  // Итоговая разбивка: серверный quote, если есть, иначе клиентская оценка.
  const showTotal = quote ? quote.total : estTotal;

  if (done) {
    return (
      <div className="ed-vac-widget">
        <div
          style={{
            border: "1px solid var(--border-subtle)",
            background: "var(--bg-elevated)",
            padding: 24,
            borderRadius: 14,
          }}
        >
          <div className="serif" style={{ fontSize: "1.5rem", letterSpacing: "-0.02em", color: "var(--accent)" }}>
            ✓ Request sent
          </div>
          <p style={{ marginTop: 12, fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 }}>
            Reference <span className="tnum" style={{ color: "var(--text-primary)" }}>{done}</span>.
            You&apos;ll get a confirmation by email shortly — no charge yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="ed-vac-widget">
      <div
        style={{
          border: "1px solid var(--border-subtle)",
          background: "var(--bg-elevated)",
          padding: 24,
          borderRadius: 14,
          boxShadow: "0 1px 2px rgba(11,11,12,0.04), 0 18px 50px -28px rgba(11,11,12,0.22)",
        }}
      >
        {/* Price + rating */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18 }}>
          <div className="serif" style={{ fontSize: "1.75rem", letterSpacing: "-0.02em" }}>
            {money(nightly)}
            <span style={{ fontSize: "0.5em", color: "var(--text-tertiary)", fontStyle: "italic" }}> / night</span>
          </div>
          {rating ? (
            <div className="tnum" style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
              <span style={{ color: "var(--accent)" }}>★</span> {rating}
              {reviews ? ` · ${reviews}` : ""}
            </div>
          ) : null}
        </div>

        {/* Date fields */}
        <div style={{ border: "1px solid var(--border-medium)", marginBottom: 10, borderRadius: 8, overflow: "hidden" }}>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", width: "100%", textAlign: "left", background: "transparent", border: "none", cursor: "pointer" }}
          >
            <div style={{ padding: "10px 12px", borderRight: "1px solid var(--border-medium)" }}>
              <div style={{ fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--text-tertiary)" }}>Check-in</div>
              <div style={{ fontSize: 13, color: start ? "var(--text-primary)" : "var(--text-tertiary)", marginTop: 3 }}>
                {start ? fmtShort(start) : "Add date"}
              </div>
            </div>
            <div style={{ padding: "10px 12px" }}>
              <div style={{ fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--text-tertiary)" }}>Checkout</div>
              <div style={{ fontSize: 13, color: end ? "var(--text-primary)" : "var(--text-tertiary)", marginTop: 3 }}>
                {end ? fmtShort(end) : "Add date"}
              </div>
            </div>
          </button>
          {open ? (
            <div style={{ padding: 14, borderTop: "1px solid var(--border-medium)" }}>
              <Calendar
                start={start}
                end={end}
                onPick={pick}
                bookedDates={bookedDates}
              />
              <div style={{ marginTop: 10, fontSize: 11, color: "var(--text-tertiary)", textAlign: "center" }}>
                Minimum stay {minNights} night{minNights > 1 ? "s" : ""}
              </div>
            </div>
          ) : null}
        </div>

        {/* Guests */}
        <div style={{ border: "1px solid var(--border-medium)", padding: "10px 14px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", borderRadius: 8 }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--text-tertiary)" }}>Guests</div>
            <div className="tnum" style={{ fontSize: 13, marginTop: 3 }}>{guests} guest{guests > 1 ? "s" : ""}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <StepBtn label="−" onClick={() => setGuests(Math.max(1, guests - 1))} />
            <StepBtn label="+" onClick={() => setGuests(Math.min(cap, guests + 1))} />
          </div>
        </div>

        {stage === "pick" ? (
          <button
            type="button"
            onClick={handleReserve}
            disabled={pending}
            className="btn-solid"
            style={{
              width: "100%", justifyContent: "center", padding: "16px", borderRadius: 10,
              fontSize: 13, letterSpacing: "0.06em", textTransform: "uppercase",
              opacity: nights >= minNights ? 1 : 0.5, display: "flex", border: "none",
              cursor: nights >= minNights ? "pointer" : "default",
            }}
          >
            {pending ? "Checking…" : nights ? `Reserve · ${nights} night${nights > 1 ? "s" : ""}` : "Reserve"}
          </button>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Field value={name} placeholder="Full name" onChange={setName} />
            <Field value={email} placeholder="Email" type="email" onChange={setEmail} />
            <Field value={phone} placeholder="Phone (optional)" type="tel" onChange={setPhone} />
            <button
              type="button"
              onClick={handleSend}
              disabled={pending}
              className="btn-solid"
              style={{ width: "100%", justifyContent: "center", padding: "16px", borderRadius: 10, fontSize: 13, letterSpacing: "0.06em", textTransform: "uppercase", display: "flex", border: "none" }}
            >
              {pending ? "Sending…" : "Send booking request"}
            </button>
          </div>
        )}

        <div style={{ textAlign: "center", fontSize: 11, color: "var(--text-tertiary)", marginTop: 10 }}>
          You won&apos;t be charged yet
        </div>

        {error ? (
          <p role="alert" style={{ marginTop: 10, fontSize: 12, color: "#B7392E", textAlign: "center" }}>{error}</p>
        ) : null}

        {/* Breakdown */}
        {nights > 0 ? (
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", gap: 10, fontSize: 13.5 }}>
            <BRow label={`${money(nightly)} × ${nights} night${nights > 1 ? "s" : ""}`} val={money(quote ? quote.subtotal : sub)} />
            {(quote ? quote.cleaningFee : cleaning) > 0 ? (
              <BRow label="Cleaning fee" val={money(quote ? quote.cleaningFee : cleaning)} />
            ) : null}
            {(quote ? quote.taxes : service) > 0 ? (
              <BRow label={quote ? "Taxes" : "Service fee"} val={money(quote ? quote.taxes : service)} />
            ) : null}
            <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 12, marginTop: 2 }}>
              <BRow label="Total" val={money(showTotal)} bold />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StepBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: 28, height: 28, borderRadius: "50%", border: "1px solid var(--border-medium)",
        color: "var(--text-primary)", fontSize: 15, lineHeight: 1, background: "transparent", cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function Field({
  value,
  placeholder,
  onChange,
  type = "text",
}: {
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      aria-label={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%", padding: "12px 14px", border: "1px solid var(--border-medium)",
        borderRadius: 8, background: "var(--bg-elevated)", fontFamily: "inherit",
        fontSize: 14, color: "var(--text-primary)", outline: "none",
      }}
    />
  );
}

function BRow({ label, val, bold }: { label: string; val: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
      <span style={{ color: bold ? "var(--text-primary)" : "var(--text-secondary)", fontWeight: bold ? 500 : 400 }}>{label}</span>
      <span className="serif tnum" style={{ color: bold ? "var(--accent)" : "var(--text-primary)", fontSize: bold ? "1.1rem" : "inherit" }}>{val}</span>
    </div>
  );
}

// ------- Inline month calendar with range selection -------

function Calendar({
  start,
  end,
  onPick,
  bookedDates,
}: {
  start: Date | null;
  end: Date | null;
  onPick: (d: Date) => void;
  bookedDates: string[];
}) {
  const bookedSet = React.useMemo(() => new Set(bookedDates), [bookedDates]);
  const today = React.useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);
  const [view, setView] = React.useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );

  const y = view.getFullYear();
  const m = view.getMonth();
  const startWeekday = (new Date(y, m, 1).getDay() + 6) % 7; // Mon=0
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const monthLabel = view.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const canPrev = new Date(y, m, 1) > new Date(today.getFullYear(), today.getMonth(), 1);

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(y, m, d));

  const sameDay = (a: Date | null, b: Date | null) =>
    Boolean(a && b && a.getTime() === b.getTime());
  const inRange = (d: Date) => Boolean(start && end && d > start && d < end);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <button
          type="button"
          onClick={() => canPrev && setView(new Date(y, m - 1, 1))}
          disabled={!canPrev}
          aria-label="Previous month"
          style={{ width: 30, height: 30, border: "1px solid var(--border-medium)", color: canPrev ? "var(--text-primary)" : "var(--text-quaternary)", fontSize: 13, background: "transparent", cursor: canPrev ? "pointer" : "default" }}
        >
          ←
        </button>
        <span className="serif" style={{ fontSize: 15, letterSpacing: "-0.01em" }}>{monthLabel}</span>
        <button
          type="button"
          onClick={() => setView(new Date(y, m + 1, 1))}
          aria-label="Next month"
          style={{ width: 30, height: 30, border: "1px solid var(--border-medium)", color: "var(--text-primary)", fontSize: 13, background: "transparent", cursor: "pointer" }}
        >
          →
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 6 }}>
        {WEEKDAYS.map((d, i) => (
          <div
            key={i}
            style={{ textAlign: "center", fontSize: 9.5, letterSpacing: "0.1em", color: "var(--text-tertiary)", fontFamily: "var(--font-geist-mono), 'Geist Mono', monospace", padding: "2px 0" }}
          >
            {d}
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const past = d < today;
          const booked = bookedSet.has(isoDate(d));
          const disabled = past || booked;
          const selected = sameDay(d, start) || sameDay(d, end);
          const mid = inRange(d);
          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => onPick(d)}
              className="tnum"
              title={booked ? "Unavailable" : undefined}
              style={{
                aspectRatio: "1 / 1",
                fontSize: 12.5,
                border: "none",
                cursor: disabled ? "default" : "pointer",
                color: disabled ? "var(--text-quaternary)" : selected ? "var(--bg-primary)" : "var(--text-primary)",
                background: selected ? "var(--accent)" : mid ? "var(--accent-muted)" : "transparent",
                textDecoration: disabled ? "line-through" : "none",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
