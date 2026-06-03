"use client";

import * as React from "react";

import { track } from "@/features/analytics/track";
import { readAttribution } from "@/features/crm/attribution";
import { submitLead } from "@/features/crm/lead-actions";

interface Props {
  locale: string;
  /** Районы для выпадающего списка — настраиваются страницей. */
  areaOptions?: string[];
}

const INQUIRY_OPTIONS = [
  "Buy",
  "Long-term rent",
  "Vacation",
  "Investment",
  "Off-market",
];

const DEFAULT_AREAS = [
  "Palm Jumeirah",
  "Dubai Marina",
  "Downtown",
  "Business Bay",
  "Emirates Hills",
  "Not sure yet",
];

type FormState = {
  name: string;
  email: string;
  area: string;
  inquiry: string;
  message: string;
};

/** Боксовая форма-карточка (новый дизайн contact). Отправляет через
 *  существующий submitLead (CRM); inquiry/area дописываются в message. */
export function EditorialContactForm({
  locale,
  areaOptions = DEFAULT_AREAS,
}: Props) {
  const [data, setData] = React.useState<FormState>({
    name: "",
    email: "",
    area: "",
    inquiry: "Buy",
    message: "",
  });
  const [sent, setSent] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const upd = (key: keyof FormState) => (value: string) =>
    setData((d) => ({ ...d, [key]: value }));

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!data.name.trim() || !data.email.trim()) {
      setError("Name and email are required.");
      return;
    }
    setPending(true);

    // inquiry/area не имеют отдельных полей в submitLead — дописываем в текст.
    const composedMessage = [
      data.message.trim(),
      "",
      `Inquiry: ${data.inquiry}`,
      data.area ? `Area of interest: ${data.area}` : null,
    ]
      .filter((line): line is string => line !== null)
      .join("\n");

    const result = await submitLead({
      kind: "contact",
      name: data.name.trim(),
      email: data.email.trim(),
      phone: null,
      message: composedMessage,
      propertyId: null,
      locationInterest: data.area || null,
      budgetMin: null,
      budgetMax: null,
      preferredTime: null,
      locale,
      currency: readCurrencyCookie(),
      pagePath:
        typeof window !== "undefined" ? window.location.pathname : null,
      attribution: readAttribution(),
    });

    setPending(false);
    if (result.ok) {
      track("lead_form_submit", {
        data: { kind: "contact", inquiry: data.inquiry },
      });
      setSent(true);
    } else {
      setError(result.error);
    }
  }

  const firstName = data.name.trim().split(/\s+/)[0] ?? "";

  return (
    <div
      className="cm-formcard"
      style={{
        borderRadius: 18,
        border: "1px solid var(--border-subtle)",
        background: "var(--bg-elevated)",
        boxShadow:
          "0 1px 2px rgba(11,11,12,0.04), 0 24px 60px -34px rgba(11,11,12,0.22)",
        padding: "clamp(24px, 3vw, 38px)",
      }}
    >
      {sent ? (
        <div style={{ padding: "40px 0", textAlign: "center" }}>
          <span className="eyebrow gold">Sent</span>
          <h2
            className="serif"
            style={{
              fontSize: "clamp(1.75rem, 3vw, 2.25rem)",
              letterSpacing: "-0.025em",
              margin: "14px 0",
              fontWeight: 400,
              lineHeight: 1.1,
            }}
          >
            Thank you{firstName ? `, ${firstName}` : ""}.
            <br />
            I&apos;ll reply within the hour.
          </h2>
          <p
            style={{
              fontSize: 14,
              color: "var(--text-secondary)",
              maxWidth: "40ch",
              margin: "0 auto",
            }}
          >
            If it&apos;s urgent, WhatsApp or call me directly — details on the
            left.
          </p>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 20 }}
        >
          <div>
            <h2
              className="serif"
              style={{
                fontSize: "1.5rem",
                letterSpacing: "-0.02em",
                fontWeight: 400,
              }}
            >
              Send a message
            </h2>
            <p
              style={{
                fontSize: 13,
                color: "var(--text-tertiary)",
                marginTop: 6,
              }}
            >
              Fields marked * are required.
            </p>
          </div>

          <div
            className="cm-row"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 18,
            }}
          >
            <CField
              label="Name *"
              placeholder="Your name"
              value={data.name}
              onChange={upd("name")}
              required
            />
            <CField
              label="Email *"
              type="email"
              placeholder="you@example.com"
              value={data.email}
              onChange={upd("email")}
              required
            />
          </div>

          <CSelect
            label="Area of interest"
            value={data.area}
            onChange={upd("area")}
            placeholder="Select a district (optional)"
            options={areaOptions}
          />

          <CPills
            label="I'm interested in"
            value={data.inquiry}
            onChange={upd("inquiry")}
            options={INQUIRY_OPTIONS}
          />

          <CField
            label="Message"
            textarea
            placeholder="What are you looking for? The more specific, the better."
            value={data.message}
            onChange={upd("message")}
          />

          {error ? (
            <p
              role="alert"
              style={{ fontSize: 13, color: "#B7392E", margin: 0 }}
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            className="btn-solid"
            disabled={pending}
            style={{
              justifyContent: "center",
              padding: 15,
              borderRadius: 12,
              fontSize: 13.5,
              letterSpacing: "0.04em",
              display: "flex",
              alignItems: "center",
              opacity: pending ? 0.7 : 1,
            }}
          >
            {pending ? "Sending…" : "Send message"}
            <span style={{ marginLeft: 8 }}>→</span>
          </button>
          <p
            style={{
              fontSize: 11.5,
              color: "var(--text-tertiary)",
              textAlign: "center",
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            Contacted only by Alexey. Never shared, never resold.
          </p>
        </form>
      )}
      <style>{`
        @media (max-width: 520px) {
          .cm-row { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

// ── form controls (boxed, clear) ─────────────────────────────

function CField({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  textarea,
  required,
}: {
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  textarea?: boolean;
  required?: boolean;
}) {
  const [focused, setFocused] = React.useState(false);
  const shared = {
    placeholder,
    value,
    required,
    onChange: (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => onChange(e.target.value),
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    style: {
      width: "100%",
      padding: "13px 16px",
      fontFamily: "inherit",
      fontSize: 15,
      color: "var(--text-primary)",
      background: "var(--bg-secondary)",
      border: `1px solid ${focused ? "var(--accent)" : "var(--border-subtle)"}`,
      borderRadius: 11,
      outline: "none",
      resize: "none" as const,
      boxShadow: focused ? "0 0 0 4px var(--accent-muted)" : "none",
      transition: "all 300ms var(--ease-out-expo)",
    },
  };
  return (
    <label style={{ display: "block" }}>
      <span
        style={{
          display: "block",
          fontSize: 10.5,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: focused ? "var(--accent)" : "var(--text-tertiary)",
          marginBottom: 9,
          transition: "color 300ms",
        }}
      >
        {label}
      </span>
      {textarea ? (
        <textarea rows={4} {...shared} />
      ) : (
        <input type={type} {...shared} />
      )}
    </label>
  );
}

function CSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <div style={{ position: "relative" }}>
      <span
        style={{
          display: "block",
          fontSize: 10.5,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: open ? "var(--accent)" : "var(--text-tertiary)",
          marginBottom: 9,
        }}
      >
        {label}
      </span>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        style={{
          width: "100%",
          padding: "13px 16px",
          fontFamily: "inherit",
          fontSize: 15,
          textAlign: "left",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          color: value ? "var(--text-primary)" : "var(--text-tertiary)",
          background: "var(--bg-secondary)",
          border: `1px solid ${open ? "var(--accent)" : "var(--border-subtle)"}`,
          borderRadius: 11,
          cursor: "pointer",
          boxShadow: open ? "0 0 0 4px var(--accent-muted)" : "none",
          transition: "all 300ms var(--ease-out-expo)",
        }}
      >
        <span>{value || placeholder}</span>
        <span
          style={{
            fontSize: 10,
            color: "var(--text-tertiary)",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 300ms",
          }}
        >
          ▾
        </span>
      </button>
      {open ? (
        <div
          className="ed-light-panel"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            zIndex: 10,
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-subtle)",
            borderRadius: 11,
            overflow: "hidden",
            boxShadow: "0 16px 36px -16px rgba(11,11,12,0.2)",
          }}
        >
          {options.map((o) => (
            <button
              key={o}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(o);
                setOpen(false);
              }}
              style={{
                display: "block",
                width: "100%",
                padding: "12px 16px",
                textAlign: "left",
                fontSize: 14,
                color: o === value ? "var(--accent)" : "var(--text-primary)",
                background: "transparent",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {o}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CPills({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <div>
      <span
        style={{
          display: "block",
          fontSize: 10.5,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--text-tertiary)",
          marginBottom: 12,
        }}
      >
        {label}
      </span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
        {options.map((o) => {
          const on = value === o;
          return (
            <button
              key={o}
              type="button"
              onClick={() => onChange(o)}
              style={{
                padding: "9px 16px",
                fontSize: 13,
                borderRadius: 999,
                cursor: "pointer",
                border: `1px solid ${on ? "var(--accent)" : "var(--border-medium)"}`,
                background: on ? "var(--accent)" : "transparent",
                color: on ? "var(--bg-primary)" : "var(--text-secondary)",
                fontFamily: "inherit",
                transition: "all 300ms var(--ease-out-expo)",
              }}
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---- utils ------------------------------------------------------

function readCurrencyCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )krent_currency=([^;]*)/);
  return match && match[1] ? decodeURIComponent(match[1]) : null;
}
