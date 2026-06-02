"use client";

import * as React from "react";

import { track } from "@/features/analytics/track";
import { readAttribution } from "@/features/crm/attribution";
import { submitLead } from "@/features/crm/lead-actions";

interface Props {
  eyebrow: string | null;
  lead: string | null;
  accent: string | null;
  subtitle: string | null;
  imageUrl: string | null;
  locale: string;
}

const DEFAULT_SUBSCRIBE_IMG =
  "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=2000&q=85&auto=format&fit=crop";

/** Тёмный баннер "Quarterly market reports" с формой подписки.
 *  Email уходит в CRM через тот же submitLead, что и контактная форма. */
export function SubscribeBand({
  eyebrow,
  lead,
  accent,
  subtitle,
  imageUrl,
  locale,
}: Props) {
  const [email, setEmail] = React.useState("");
  const [sent, setSent] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const value = email.trim();
    if (!value) {
      setError("Enter your email.");
      return;
    }
    setPending(true);
    const result = await submitLead({
      kind: "contact",
      name: "Newsletter subscriber",
      email: value,
      phone: null,
      message: "Subscribed to the quarterly Dubai market report.",
      propertyId: null,
      locationInterest: null,
      budgetMin: null,
      budgetMax: null,
      preferredTime: null,
      locale,
      currency: null,
      pagePath:
        typeof window !== "undefined" ? window.location.pathname : null,
      attribution: readAttribution(),
    });
    setPending(false);
    if (result.ok) {
      track("lead_form_submit", { data: { kind: "newsletter" } });
      setSent(true);
    } else {
      setError(result.error);
    }
  }

  return (
    <section
      className="on-dark"
      style={{ position: "relative", overflow: "hidden", background: "#0F0F12" }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url(${imageUrl || DEFAULT_SUBSCRIBE_IMG})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "brightness(0.4)",
        }}
      />
      <div style={{ position: "relative" }}>
        <div
          style={{
            maxWidth: "var(--max-w)",
            margin: "0 auto",
            padding: "clamp(72px, 8vw, 110px) var(--edge-d)",
            textAlign: "center",
          }}
        >
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            {eyebrow ? (
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: "0.32em",
                  textTransform: "uppercase",
                  color: "var(--accent)",
                  marginBottom: 18,
                  fontWeight: 500,
                }}
              >
                {eyebrow}
              </div>
            ) : null}
            <h2
              className="serif"
              style={{
                fontSize: "clamp(2rem, 4.4vw, 3.5rem)",
                letterSpacing: "-0.02em",
                lineHeight: 1.04,
                fontWeight: 400,
                color: "#F5F4EE",
              }}
            >
              {lead}{" "}
              <em style={{ fontStyle: "italic", color: "var(--accent)" }}>
                {accent}
              </em>
            </h2>
          </div>

          {subtitle ? (
            <p
              style={{
                marginTop: 20,
                fontSize: 16,
                color: "rgba(245,244,238,0.78)",
                maxWidth: "46ch",
                margin: "20px auto 0",
              }}
            >
              {subtitle}
            </p>
          ) : null}

          {!sent ? (
            <form
              onSubmit={handleSubmit}
              style={{
                marginTop: 36,
                display: "flex",
                gap: 0,
                maxWidth: 520,
                margin: "36px auto 0",
                border: "1px solid rgba(245,244,238,0.3)",
              }}
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  padding: "16px 20px",
                  fontFamily: "inherit",
                  fontSize: 15,
                  color: "#F5F4EE",
                }}
              />
              <button
                type="submit"
                className="btn-solid"
                disabled={pending}
                style={{
                  borderRadius: 0,
                  padding: "0 28px",
                  fontSize: 12,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  border: "none",
                }}
              >
                {pending ? "Sending…" : "Subscribe"}
              </button>
            </form>
          ) : (
            <p
              className="serif"
              style={{
                marginTop: 36,
                fontSize: "1.5rem",
                color: "var(--accent)",
                fontStyle: "italic",
              }}
            >
              Thank you — you&apos;re on the list.
            </p>
          )}

          {error ? (
            <p
              role="alert"
              style={{
                marginTop: 16,
                fontSize: 13,
                color: "#E0A89F",
              }}
            >
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
