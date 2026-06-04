"use client";

import * as React from "react";

import type { SiteContactInfo } from "@/components/layout/public-layout";

const MONO = "'Geist Mono', ui-monospace, monospace";

function waHref(value: string): string {
  if (value.startsWith("http")) return value;
  const digits = value.replace(/[^\d]/g, "");
  return digits ? `https://wa.me/${digits}` : "#";
}

/** Плавающая кнопка «наверх» (слева снизу), появляется при прокрутке. */
export function ScrollTopButton() {
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 500);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      aria-label="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      style={{
        position: "fixed",
        left: 24,
        bottom: 24,
        zIndex: 90,
        width: 48,
        height: 48,
        borderRadius: "50%",
        border: "1px solid var(--border-medium)",
        background: "var(--bg-elevated)",
        color: "var(--text-primary)",
        cursor: "pointer",
        boxShadow: "0 10px 28px -12px rgba(11,11,12,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 18,
        fontFamily: "inherit",
        opacity: show ? 1 : 0,
        transform: show ? "translateY(0)" : "translateY(12px)",
        pointerEvents: show ? "auto" : "none",
        transition: "opacity 400ms var(--ease-out-expo), transform 400ms var(--ease-out-expo)",
      }}
    >
      ↑
    </button>
  );
}

/** Плавающая кнопка связи (справа снизу): раскрывает WhatsApp / Messenger / Email. */
export function ContactFab({ contact }: { contact: SiteContactInfo }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const channels: {
    label: string;
    value: string;
    href: string;
    glyph: string;
    accent: string;
  }[] = [];
  if (contact.whatsapp) {
    channels.push({
      label: "WhatsApp",
      value: "Chat now",
      href: waHref(contact.whatsapp),
      glyph: "WA",
      accent: "#25D366",
    });
  }
  if (contact.messenger) {
    channels.push({
      label: "Messenger",
      value: "Send a message",
      href: contact.messenger,
      glyph: "M",
      accent: "#0084FF",
    });
  }
  if (contact.email) {
    channels.push({
      label: "Email",
      value: contact.email,
      href: `mailto:${contact.email}`,
      glyph: "@",
      accent: "var(--accent)",
    });
  }
  if (channels.length === 0) return null;

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        right: 24,
        bottom: 24,
        zIndex: 90,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 12,
      }}
    >
      {open ? (
        <div
          className="ed-light-panel"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            padding: 8,
            borderRadius: 16,
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-subtle)",
            boxShadow: "0 24px 60px -24px rgba(11,11,12,0.32)",
            minWidth: 220,
          }}
        >
          {channels.map((c) => (
            <a
              key={c.label}
              href={c.href}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 12px",
                borderRadius: 11,
                textDecoration: "none",
                color: "var(--text-primary)",
                transition: "background 240ms",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--bg-secondary)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <span
                style={{
                  flexShrink: 0,
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: MONO,
                  fontSize: 14,
                  color: "#fff",
                  background: c.accent,
                }}
              >
                {c.glyph}
              </span>
              <span style={{ minWidth: 0 }}>
                <span
                  className="serif"
                  style={{
                    display: "block",
                    fontSize: 15,
                    letterSpacing: "-0.01em",
                    color: "var(--text-primary)",
                  }}
                >
                  {c.label}
                </span>
                <span
                  style={{
                    display: "block",
                    fontSize: 12,
                    color: "var(--text-tertiary)",
                  }}
                >
                  {c.value}
                </span>
              </span>
            </a>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        aria-label="Contact us"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          border: "none",
          background: "var(--accent)",
          color: "var(--bg-primary)",
          cursor: "pointer",
          boxShadow: "0 12px 32px -10px rgba(139,115,64,0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          alignSelf: "flex-end",
          transition: "transform 300ms var(--ease-out-expo)",
        }}
      >
        {open ? (
          <span style={{ fontSize: 24, lineHeight: 1 }}>×</span>
        ) : (
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7a8.5 8.5 0 0 1-.9-3.8 8.38 8.38 0 0 1 8.5-8.5 8.38 8.38 0 0 1 8.5 8.5z" />
          </svg>
        )}
      </button>
    </div>
  );
}
