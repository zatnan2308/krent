import type { ReactNode } from "react";
import Link from "next/link";

import { PrivateLocaleSwitcher } from "@/components/shared/private-locale-switcher";
import { ROUTES } from "@/lib/constants/routes";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { I18nProvider } from "@/lib/i18n/provider";
import { getRequestLocale } from "@/lib/i18n/runtime";
import { requireUser } from "@/server/auth";

export const dynamic = "force-dynamic";

function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((p) => p.charAt(0))
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U"
  );
}

export default async function AccountLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireUser();
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const name =
    (typeof meta.full_name === "string" && meta.full_name.trim()) ||
    (user.email ? user.email.split("@")[0]! : "Account");
  const initials = initialsOf(name);
  const locale = await getRequestLocale();
  const dictionary = getDictionary(locale);

  return (
    <I18nProvider locale={locale} dictionary={dictionary}>
    <div className="editorial" style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <div className="grain" />

      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: "rgba(245, 244, 238, 0.82)",
          backdropFilter: "blur(18px) saturate(1.2)",
          WebkitBackdropFilter: "blur(18px) saturate(1.2)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div
          style={{
            maxWidth: "var(--max-w)",
            margin: "0 auto",
            padding: "16px var(--edge-d)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 24,
          }}
        >
          <Link
            href={ROUTES.public.home}
            style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}
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
                letterSpacing: "-0.02em",
              }}
            >
              AK
            </span>
            <span
              style={{
                fontSize: 12,
                letterSpacing: "0.04em",
                color: "var(--text-secondary)",
              }}
            >
              ← Back to site
            </span>
          </Link>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <PrivateLocaleSwitcher currentLocale={locale} />
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                fontSize: 12,
                color: "var(--text-primary)",
                letterSpacing: "0.01em",
              }}
            >
              <span
                className="serif"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 28,
                  height: 28,
                  background: "var(--accent)",
                  color: "var(--bg-primary)",
                  fontSize: 11,
                  fontStyle: "italic",
                  flexShrink: 0,
                }}
              >
                {initials}
              </span>
              <span style={{ whiteSpace: "nowrap" }}>{name}</span>
            </span>
            <form action="/api/auth/sign-out" method="post">
              <button
                type="submit"
                style={{
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  letterSpacing: "0.02em",
                }}
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      {children}

      <footer
        style={{
          borderTop: "1px solid var(--border-subtle)",
          padding: "28px var(--edge-d)",
          background: "var(--bg-secondary)",
        }}
      >
        <div
          style={{
            maxWidth: "var(--max-w)",
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
            fontSize: 12,
            color: "var(--text-tertiary)",
            letterSpacing: "0.02em",
          }}
        >
          <span>© {new Date().getFullYear()} · Client account</span>
          <Link href={ROUTES.public.home} style={{ color: "var(--text-secondary)" }}>
            Back to site →
          </Link>
        </div>
      </footer>
    </div>
    </I18nProvider>
  );
}
