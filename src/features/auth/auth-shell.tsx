"use client";

import * as React from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";

import { DEFAULT_BRANDING } from "@/lib/branding";
import { ROUTES } from "@/lib/constants/routes";

const VISUAL_IMG =
  "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1600&q=85&auto=format&fit=crop";

const VALUE_PROPS = [
  "Off-market listings, first.",
  "Replies within the hour.",
  "One broker, the whole city.",
  "Booking to keys, end to end.",
];

function monogram(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase();
}

type AuthTab = "signin" | "register";

/** Editorial split-screen оболочка для всех auth-страниц.
 *  Левая панель — визуал/бренд, правая — форма (children). */
export function AuthShell({
  eyebrow,
  title,
  activeTab,
  brandName = DEFAULT_BRANDING.logoText,
  tagline = "Licensed Realtor",
  children,
}: {
  eyebrow: string;
  /** Заголовок левой панели; \n даёт перенос строки. */
  title: string;
  activeTab?: AuthTab;
  brandName?: string;
  tagline?: string;
  children: React.ReactNode;
}) {
  const [pi, setPi] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(
      () => setPi((p) => (p + 1) % VALUE_PROPS.length),
      3200,
    );
    return () => clearInterval(id);
  }, []);

  const mono = monogram(brandName);

  return (
    <div
      className="au-split"
      style={{
        display: "grid",
        gridTemplateColumns: "1.05fr 0.95fr",
        minHeight: "100vh",
        background: "var(--bg-primary)",
      }}
    >
      {/* ---- Visual panel ---- */}
      <div
        className="au-visual on-dark"
        style={{ position: "relative", overflow: "hidden", background: "#0F0F12" }}
      >
        <div
          className="au-zoom"
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${VISUAL_IMG})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "brightness(0.62) saturate(0.9)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(11,11,12,0.55) 0%, rgba(11,11,12,0.1) 35%, rgba(11,11,12,0.35) 70%, rgba(11,11,12,0.85) 100%)",
          }}
        />

        {/* top brand */}
        <div
          style={{
            position: "absolute",
            top: 32,
            left: 36,
            right: 36,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            zIndex: 2,
          }}
        >
          <Link
            href={ROUTES.public.home}
            style={{ display: "flex", alignItems: "center", gap: 12 }}
          >
            <span
              className="serif"
              style={{
                width: 38,
                height: 38,
                border: "1px solid var(--accent)",
                color: "var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 15,
                fontStyle: "italic",
                letterSpacing: "-0.02em",
              }}
            >
              {mono}
            </span>
            <span
              style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}
            >
              <span
                className="serif"
                style={{ fontSize: 16, color: "#F5F4EE", letterSpacing: "-0.015em" }}
              >
                {brandName}
              </span>
              <span
                style={{
                  fontSize: 9,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "var(--accent)",
                }}
              >
                {tagline}
              </span>
            </span>
          </Link>
          <Link
            href={ROUTES.public.home}
            style={{
              fontSize: 12,
              letterSpacing: "0.04em",
              color: "rgba(245,244,238,0.7)",
            }}
          >
            ← Back to site
          </Link>
        </div>

        {/* editorial copy */}
        <div
          style={{ position: "absolute", left: 36, right: 36, bottom: 110, zIndex: 2 }}
        >
          <span className="eyebrow" style={{ color: "var(--accent)" }}>
            <span className="dot" /> {eyebrow}
          </span>
          <h1
            className="serif"
            style={{
              fontSize: "clamp(2.25rem, 3.6vw, 3.5rem)",
              letterSpacing: "-0.035em",
              lineHeight: 1,
              marginTop: 18,
              fontWeight: 400,
              color: "#F5F4EE",
              whiteSpace: "pre-line",
            }}
          >
            {title}
          </h1>
        </div>

        {/* rotating value prop */}
        <div
          style={{
            position: "absolute",
            left: 36,
            right: 36,
            bottom: 44,
            zIndex: 2,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span style={{ width: 24, height: 1, background: "var(--accent)" }} />
          <span
            key={pi}
            style={{
              fontSize: 13.5,
              color: "rgba(245,244,238,0.85)",
              letterSpacing: "0.01em",
              animation: "auFade 700ms var(--ease-out-expo)",
            }}
          >
            {VALUE_PROPS[pi] ?? VALUE_PROPS[0]}
          </span>
        </div>
      </div>

      {/* ---- Form panel ---- */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "clamp(32px, 5vw, 64px)",
        }}
      >
        <div style={{ width: "100%", maxWidth: 400 }}>
          {/* mobile brand */}
          <Link
            href={ROUTES.public.home}
            className="au-mobile-brand"
            style={{ display: "none", alignItems: "center", gap: 10, marginBottom: 28 }}
          >
            <span
              className="serif"
              style={{
                width: 34,
                height: 34,
                border: "1px solid var(--accent)",
                color: "var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontStyle: "italic",
              }}
            >
              {mono}
            </span>
            <span className="serif" style={{ fontSize: 16, letterSpacing: "-0.015em" }}>
              {brandName}
            </span>
          </Link>

          {/* tab toggle (login/sign-up only) */}
          {activeTab ? (
            <div
              style={{
                position: "relative",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: 12,
                padding: 4,
                marginBottom: 32,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 4,
                  bottom: 4,
                  left: activeTab === "signin" ? 4 : "50%",
                  width: "calc(50% - 4px)",
                  background: "var(--bg-elevated)",
                  borderRadius: 9,
                  boxShadow: "0 1px 3px rgba(11,11,12,0.1)",
                }}
              />
              {(
                [
                  ["signin", "Sign in", ROUTES.auth.signIn],
                  ["register", "Create account", ROUTES.auth.signUp],
                ] as const
              ).map(([key, label, href]) => (
                <Link
                  key={key}
                  href={href}
                  style={{
                    position: "relative",
                    zIndex: 1,
                    textAlign: "center",
                    padding: 10,
                    fontSize: 13,
                    letterSpacing: "0.01em",
                    color:
                      activeTab === key
                        ? "var(--text-primary)"
                        : "var(--text-tertiary)",
                    fontWeight: activeTab === key ? 500 : 400,
                  }}
                >
                  {label}
                </Link>
              ))}
            </div>
          ) : null}

          {children}

          {/* footer switch */}
          <p
            style={{
              marginTop: 26,
              textAlign: "center",
              fontSize: 13,
              color: "var(--text-secondary)",
            }}
          >
            {activeTab === "register" ? (
              <>
                Already have an account?{" "}
                <Link href={ROUTES.auth.signIn} style={switchLinkStyle}>
                  Sign in
                </Link>
              </>
            ) : activeTab === "signin" ? (
              <>
                New to {brandName}?{" "}
                <Link href={ROUTES.auth.signUp} style={switchLinkStyle}>
                  Create one
                </Link>
              </>
            ) : (
              <Link href={ROUTES.auth.signIn} style={switchLinkStyle}>
                ← Back to sign in
              </Link>
            )}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes auFade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        .au-zoom { animation: auZoom 18s ease-in-out infinite alternate; }
        @keyframes auZoom { from { transform: scale(1); } to { transform: scale(1.08); } }
        @media (prefers-reduced-motion: reduce) { .au-zoom { animation: none; } }
        @media (max-width: 860px) {
          .au-split { grid-template-columns: 1fr !important; }
          .au-visual { display: none !important; }
          .au-mobile-brand { display: flex !important; }
        }
      `}</style>
    </div>
  );
}

const switchLinkStyle: React.CSSProperties = {
  color: "var(--accent)",
  fontWeight: 500,
  borderBottom: "1px solid var(--accent-line)",
  paddingBottom: 1,
};

// ── Editorial form primitives (uncontrolled, name-based for FormData) ──

const labelStyle = (focused: boolean): React.CSSProperties => ({
  display: "block",
  fontSize: 10.5,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: focused ? "var(--accent)" : "var(--text-tertiary)",
  marginBottom: 9,
  transition: "color 300ms",
});

const inputStyle = (focused: boolean): React.CSSProperties => ({
  width: "100%",
  padding: "13px 16px",
  fontFamily: "inherit",
  fontSize: 15,
  color: "var(--text-primary)",
  background: "var(--bg-secondary)",
  border: `1px solid ${focused ? "var(--accent)" : "var(--border-subtle)"}`,
  borderRadius: 11,
  outline: "none",
  boxShadow: focused ? "0 0 0 4px var(--accent-muted)" : "none",
  transition: "all 300ms var(--ease-out-expo)",
});

export function AuthField({
  label,
  name,
  type = "text",
  placeholder,
  autoComplete,
  required,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  const [focused, setFocused] = React.useState(false);
  return (
    <label style={{ display: "block" }}>
      <span style={labelStyle(focused)}>{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        defaultValue={defaultValue}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={inputStyle(focused)}
      />
    </label>
  );
}

export function AuthPasswordField({
  label,
  name,
  placeholder,
  autoComplete,
  required,
  minLength,
}: {
  label: string;
  name: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
}) {
  const [show, setShow] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  return (
    <label style={{ display: "block" }}>
      <span style={labelStyle(focused)}>{label}</span>
      <div style={{ position: "relative" }}>
        <input
          name={name}
          type={show ? "text" : "password"}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{ ...inputStyle(focused), padding: "13px 48px 13px 16px" }}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          style={{
            position: "absolute",
            right: 6,
            top: "50%",
            transform: "translateY(-50%)",
            padding: "8px 10px",
            fontSize: 10.5,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--text-tertiary)",
          }}
        >
          {show ? "Hide" : "Show"}
        </button>
      </div>
    </label>
  );
}

export function AuthSubmit({
  label,
  pendingLabel,
}: {
  label: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="btn-solid"
      disabled={pending}
      style={{
        justifyContent: "center",
        padding: 15,
        borderRadius: 11,
        fontSize: 13.5,
        letterSpacing: "0.04em",
        display: "flex",
        alignItems: "center",
        marginTop: 4,
        opacity: pending ? 0.7 : 1,
      }}
    >
      {pending ? pendingLabel : label}
      <span style={{ marginLeft: 8 }}>→</span>
    </button>
  );
}

export function AuthNote({
  variant,
  children,
}: {
  variant: "error" | "success" | "info";
  children: React.ReactNode;
}) {
  const palette = {
    error: { fg: "#B7392E", bg: "rgba(183,57,46,0.07)", bd: "rgba(183,57,46,0.25)" },
    success: { fg: "#3f7a47", bg: "rgba(125,195,131,0.1)", bd: "rgba(125,195,131,0.35)" },
    info: { fg: "var(--accent)", bg: "var(--accent-muted)", bd: "var(--accent-line)" },
  }[variant];
  return (
    <p
      role={variant === "error" ? "alert" : "status"}
      style={{
        fontSize: 13,
        color: palette.fg,
        background: palette.bg,
        border: `1px solid ${palette.bd}`,
        borderRadius: 10,
        padding: "10px 14px",
        margin: 0,
        lineHeight: 1.45,
      }}
    >
      {children}
    </p>
  );
}
