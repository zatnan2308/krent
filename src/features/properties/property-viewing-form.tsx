"use client";

import * as React from "react";

import { track } from "@/features/analytics/track";
import { readAttribution } from "@/features/crm/attribution";
import { submitLead } from "@/features/crm/lead-actions";
import { useI18n } from "@/lib/i18n/provider";

interface Props {
  propertyId: string;
  locale: string;
}

/** Editorial split-form для запроса просмотра объекта. Underline-поля,
 *  отправка через существующий submitLead (kind="showing"). */
export function PropertyViewingForm({ propertyId, locale }: Props) {
  const { dict } = useI18n();
  const t = dict.propertyDetail;
  const [sent, setSent] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState({
    name: "",
    contact: "",
    when: "",
    format: "",
    message: "",
  });

  function upd<K extends keyof typeof data>(key: K, value: (typeof data)[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!data.name.trim() || !data.contact.trim()) {
      setError(t.vfNameContactReq);
      return;
    }

    // contact может быть email или phone — определяем по @.
    const isEmail = data.contact.includes("@");
    const composedMessage = [
      data.message.trim(),
      "",
      data.format ? `Viewing format: ${data.format}` : null,
    ]
      .filter((line) => line !== null)
      .join("\n");

    setPending(true);
    const result = await submitLead({
      kind: "showing",
      name: data.name.trim(),
      email: isEmail ? data.contact.trim() : `viewing+${Date.now()}@placeholder.local`,
      phone: isEmail ? null : data.contact.trim(),
      message: composedMessage,
      propertyId,
      locationInterest: null,
      budgetMin: null,
      budgetMax: null,
      preferredTime: data.when.trim() || null,
      locale,
      currency: readCurrencyCookie(),
      pagePath:
        typeof window !== "undefined" ? window.location.pathname : null,
      attribution: readAttribution(),
    });
    setPending(false);

    if (result.ok) {
      track("lead_form_submit", {
        entityType: "property",
        entityId: propertyId,
        data: { kind: "showing" },
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
          padding: "64px 0",
          borderTop: "1px solid var(--accent-line)",
          borderBottom: "1px solid var(--accent-line)",
        }}
      >
        <span className="eyebrow gold">{t.vfSent}</span>
        <h3
          className="serif"
          style={{
            fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
            letterSpacing: "-0.03em",
            marginTop: 14,
            lineHeight: 1.1,
            fontWeight: 350,
          }}
        >
          {t.vfThankYou}
          <br />
          We&apos;ll be in touch within the hour with available slots.
        </h3>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: 32 }}
    >
      <div
        className="ed-cta-form-row"
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}
      >
        <CTAField
          label={t.vfFullName}
          value={data.name}
          onChange={(v) => upd("name", v)}
          placeholder={t.vfYourNamePh}
          required
        />
        <CTAField
          label={t.vfPhoneEmail}
          value={data.contact}
          onChange={(v) => upd("contact", v)}
          placeholder={t.vfHowReachPh}
          required
        />
      </div>
      <div
        className="ed-cta-form-row"
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}
      >
        <CTAField
          label={t.vfPreferredDate}
          value={data.when}
          onChange={(v) => upd("when", v)}
          placeholder={t.vfWhenPh}
        />
        <CTAField
          label={t.vfFormat}
          value={data.format}
          onChange={(v) => upd("format", v)}
          placeholder={t.vfFormatPh}
        />
      </div>
      <CTAField
        label={t.vfMessage}
        value={data.message}
        onChange={(v) => upd("message", v)}
        placeholder={t.vfMessagePh}
        textarea
      />

      {error ? (
        <p role="alert" style={{ fontSize: 13, color: "#B7392E" }}>
          {error}
        </p>
      ) : null}

      <div
        style={{
          marginTop: 8,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <p
          style={{
            fontSize: 11,
            color: "var(--text-tertiary)",
            maxWidth: "36ch",
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          Replies within an hour, in your timezone, from a direct number.
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
          {pending ? t.vfSending : t.vfSendRequest} <span className="arrow">→</span>
        </button>
      </div>

      <style>{`
        @media (max-width: 760px) {
          .ed-cta-form-row { grid-template-columns: 1fr !important; gap: 24px !important; }
        }
      `}</style>
    </form>
  );
}

function CTAField({
  label,
  value,
  onChange,
  placeholder,
  textarea,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  textarea?: boolean;
  required?: boolean;
}) {
  const [focused, setFocused] = React.useState(false);
  const props = {
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
      {textarea ? <textarea rows={3} {...props} /> : <input {...props} />}
    </label>
  );
}

function readCurrencyCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )krent_currency=([^;]*)/);
  return match && match[1] ? decodeURIComponent(match[1]) : null;
}
