"use client";

import * as React from "react";

import { track } from "@/features/analytics/track";
import { readAttribution } from "@/features/crm/attribution";
import { submitLead } from "@/features/crm/lead-actions";

interface Props {
  locale: string;
}

const INQUIRY_OPTIONS = [
  "Buy",
  "Long-term rent",
  "Vacation",
  "Investment",
  "Off-market",
  "Other",
];

const REGION_OPTIONS = [
  "Downtown Dubai",
  "Dubai Marina & JBR",
  "Palm Jumeirah",
  "Emirates Hills & Dubai Hills",
  "Business Bay / DIFC",
  "Other / not sure yet",
];

const CONTACT_OPTIONS = ["WhatsApp", "Email", "Phone call", "Video call"];

/** Editorial split-screen форма с pill-row, dropdown, underline-полями.
 *  Отправляет через существующий submitLead (CRM). */
export function EditorialContactForm({ locale }: Props) {
  const [sent, setSent] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState({
    name: "",
    email: "",
    phone: "",
    region: "",
    inquiry: "Buy",
    budget: "",
    message: "",
    contact: "WhatsApp",
  });

  function upd<K extends keyof typeof data>(key: K, value: (typeof data)[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!data.name.trim() || !data.email.trim()) {
      setError("Name and email are required.");
      return;
    }
    setPending(true);

    // Собираем расширенный message: добавляем выбранные региональные
    // и сервисные значения (они не имеют отдельных полей в submitLead).
    const composedMessage = [
      data.message.trim(),
      "",
      `Inquiry: ${data.inquiry}`,
      data.region ? `Region: ${data.region}` : null,
      data.budget ? `Budget: ${data.budget}` : null,
      `Preferred contact: ${data.contact}`,
    ]
      .filter((line) => line !== null)
      .join("\n");

    const result = await submitLead({
      kind: "contact",
      name: data.name.trim(),
      email: data.email.trim(),
      phone: data.phone.trim() || null,
      message: composedMessage,
      propertyId: null,
      locationInterest: data.region || null,
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
        data: { kind: "contact", channel: data.contact },
      });
      setSent(true);
    } else {
      setError(result.error);
    }
  }

  if (sent) {
    return (
      <div
        style={{
          padding: "80px 0",
          borderTop: "1px solid var(--accent-line)",
          borderBottom: "1px solid var(--accent-line)",
        }}
      >
        <span className="eyebrow gold">Sent</span>
        <h2
          className="serif"
          style={{
            marginTop: 20,
            fontSize: "clamp(2rem, 4vw, 3rem)",
            letterSpacing: "-0.035em",
            lineHeight: 1.05,
            fontWeight: 350,
            maxWidth: "20ch",
          }}
        >
          Thank you, {data.name || "friend"}.
          <br />
          <em style={{ fontStyle: "italic", color: "var(--accent)" }}>
            We&apos;ll be in touch within the hour.
          </em>
        </h2>
        <p
          style={{
            marginTop: 24,
            fontSize: 16,
            color: "var(--text-secondary)",
            maxWidth: "46ch",
          }}
        >
          If it&apos;s urgent, the direct line and WhatsApp are on the right.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: 36 }}
    >
      {/* Row 1 — name + email */}
      <div
        className="ed-form-row"
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 36 }}
      >
        <UField
          label="Full name"
          value={data.name}
          onChange={(v) => upd("name", v)}
          placeholder="Your name"
          required
        />
        <UField
          label="Email"
          type="email"
          value={data.email}
          onChange={(v) => upd("email", v)}
          placeholder="you@example.com"
          required
        />
      </div>

      {/* Row 2 — phone + region */}
      <div
        className="ed-form-row"
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 36 }}
      >
        <UField
          label="Phone (optional)"
          value={data.phone}
          onChange={(v) => upd("phone", v)}
          placeholder="+ country code"
        />
        <UDropdown
          label="Area of interest"
          value={data.region}
          onChange={(v) => upd("region", v)}
          placeholder="Select an area"
          options={REGION_OPTIONS}
        />
      </div>

      {/* Inquiry pills */}
      <UPillRow
        label="Type of inquiry"
        value={data.inquiry}
        onChange={(v) => upd("inquiry", v)}
        options={INQUIRY_OPTIONS}
      />

      <UField
        label="Budget range (optional)"
        value={data.budget}
        onChange={(v) => upd("budget", v)}
        placeholder="e.g. $3M – 5M · or AED 11M – 18M"
      />

      <UField
        label="What are you looking for?"
        value={data.message}
        onChange={(v) => upd("message", v)}
        placeholder="The more specific, the better."
        textarea
      />

      <UPillRow
        label="Preferred way to reach you back"
        value={data.contact}
        onChange={(v) => upd("contact", v)}
        options={CONTACT_OPTIONS}
      />

      {error ? (
        <p
          role="alert"
          style={{
            fontSize: 13,
            color: "#B7392E",
            letterSpacing: "0.01em",
          }}
        >
          {error}
        </p>
      ) : null}

      <div
        style={{
          marginTop: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: 28,
          borderTop: "1px solid var(--border-subtle)",
          flexWrap: "wrap",
          gap: 20,
        }}
      >
        <p
          style={{
            fontSize: 11,
            color: "var(--text-tertiary)",
            maxWidth: "40ch",
            lineHeight: 1.5,
            letterSpacing: "0.02em",
            margin: 0,
          }}
        >
          By submitting you agree to be contacted directly. Never shared, never
          resold, never put into a newsletter you didn&apos;t ask for.
        </p>
        <button
          type="submit"
          className="btn btn-solid"
          disabled={pending}
          style={{
            padding: "18px 32px",
            fontSize: 12,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          {pending ? "Sending…" : "Send message"} <span className="arrow">→</span>
        </button>
      </div>

      <style>{`
        @media (max-width: 760px) {
          .ed-form-row { grid-template-columns: 1fr !important; gap: 32px !important; }
        }
      `}</style>
    </form>
  );
}

// ---- field primitives ------------------------------------------

function UField({
  label,
  value,
  onChange,
  placeholder,
  textarea,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  textarea?: boolean;
  type?: string;
  required?: boolean;
}) {
  const [focused, setFocused] = React.useState(false);
  const commonProps = {
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(e.target.value),
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    placeholder,
    required,
    style: {
      width: "100%",
      background: "transparent",
      border: "none",
      borderBottom: `1px solid ${focused ? "var(--accent)" : "var(--border-medium)"}`,
      padding: "6px 0 14px",
      fontFamily: "inherit",
      fontSize: 16,
      color: "var(--text-primary)",
      outline: "none",
      resize: "none" as const,
      letterSpacing: "-0.005em",
      transition: "border-color 400ms var(--ease-out-expo)",
    },
  };
  return (
    <label style={{ display: "block" }}>
      <div
        style={{
          fontSize: 10.5,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: focused ? "var(--accent)" : "var(--text-tertiary)",
          marginBottom: 12,
          transition: "color 400ms var(--ease-out-expo)",
        }}
      >
        {label}
      </div>
      {textarea ? (
        <textarea rows={4} {...commonProps} />
      ) : (
        <input type={type} {...commonProps} />
      )}
    </label>
  );
}

function UDropdown({
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
    <div
      style={{ display: "block", position: "relative" }}
      onMouseLeave={() => setOpen(false)}
    >
      <div
        style={{
          fontSize: 10.5,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: open ? "var(--accent)" : "var(--text-tertiary)",
          marginBottom: 12,
          transition: "color 400ms var(--ease-out-expo)",
        }}
      >
        {label}
      </div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          background: "transparent",
          border: "none",
          borderBottom: `1px solid ${open ? "var(--accent)" : "var(--border-medium)"}`,
          padding: "6px 0 14px",
          fontFamily: "inherit",
          fontSize: 16,
          color: value ? "var(--text-primary)" : "var(--text-tertiary)",
          outline: "none",
          textAlign: "left",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          cursor: "pointer",
          letterSpacing: "-0.005em",
        }}
      >
        <span>{value || placeholder}</span>
        <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>▾</span>
      </button>
      {open ? (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-subtle)",
            zIndex: 10,
            boxShadow: "0 16px 32px -12px rgba(11,11,12,0.12)",
          }}
        >
          {options.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => {
                onChange(o);
                setOpen(false);
              }}
              style={{
                display: "block",
                width: "100%",
                padding: "12px 18px",
                textAlign: "left",
                fontSize: 14,
                color: o === value ? "var(--accent)" : "var(--text-primary)",
                background: "transparent",
                border: "none",
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

function UPillRow({
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
      <div
        style={{
          fontSize: 10.5,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "var(--text-tertiary)",
          marginBottom: 16,
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", gap: "8px 28px", flexWrap: "wrap" }}>
        {options.map((o) => {
          const active = value === o;
          return (
            <button
              key={o}
              type="button"
              onClick={() => onChange(o)}
              style={{
                padding: "8px 0",
                fontSize: 14,
                color: active ? "var(--accent)" : "var(--text-secondary)",
                borderBottom: `1px solid ${active ? "var(--accent)" : "transparent"}`,
                letterSpacing: "-0.005em",
                background: "transparent",
                border: "none",
                borderBottomWidth: 1,
                borderBottomStyle: "solid",
                borderBottomColor: active ? "var(--accent)" : "transparent",
                cursor: "pointer",
                fontFamily: "inherit",
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
