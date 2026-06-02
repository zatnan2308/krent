"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { CurrencySwitcher } from "@/components/shared/currency-switcher";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { ROUTES } from "@/lib/constants/routes";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { buildLocalizedPath } from "@/lib/seo";

interface PublicHeaderProps {
  locale: Locale;
  dictionary: Dictionary;
  siteName: string;
  logoUrl: string | null;
  supportPhone?: string | null;
  currentUserName?: string | null;
  currentUserEmail?: string | null;
}

/** Маленький монограмм-knob AK в рамке (editorial mark). */
function Monogram({ size = 32, gold = false }: { size?: number; gold?: boolean }) {
  return (
    <span
      className="serif"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        border: `1px solid ${gold ? "var(--accent)" : "var(--border-medium)"}`,
        color: gold ? "var(--accent)" : "var(--text-primary)",
        fontSize: size * 0.42,
        letterSpacing: "-0.02em",
        fontWeight: 400,
        lineHeight: 1,
        fontStyle: "italic",
        flexShrink: 0,
      }}
    >
      AK
    </span>
  );
}

export function PublicHeader({
  locale,
  dictionary,
  siteName,
  logoUrl,
  supportPhone,
  currentUserName,
  currentUserEmail,
}: PublicHeaderProps) {
  const [scrolled, setScrolled] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const pathname = usePathname() ?? "";

  // Закрываем dropdown по клику вне его.
  const userMenuRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!userMenuOpen) return;
    function onClick(event: MouseEvent) {
      if (!userMenuRef.current?.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [userMenuOpen]);

  const isAuthed = Boolean(currentUserName || currentUserEmail);
  const greeting = currentUserName ?? currentUserEmail?.split("@")[0] ?? "User";
  const initials = (currentUserName || currentUserEmail || "U")
    .split(/\s+/)
    .map((s) => s.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Прозрачный header с on-dark текстом — только на главной (hero-photo
  // под хедером). На всех остальных страницах хедер сразу cream с blur,
  // потому что сразу под ним идёт светлый контент или светлая hero-секция.
  const isHome = pathname === `/${locale}` || pathname === `/${locale}/`;

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navItems = [
    { label: "Properties", href: buildLocalizedPath(locale, "/properties") },
    { label: "Buy", href: buildLocalizedPath(locale, "/properties?purpose=sale") },
    {
      label: "Rent",
      href: buildLocalizedPath(locale, "/properties?purpose=long_term_rent"),
    },
    {
      label: "Vacation",
      href: buildLocalizedPath(locale, "/properties?purpose=short_term_rental"),
    },
    { label: "About", href: buildLocalizedPath(locale, "/about") },
    { label: "Contact", href: buildLocalizedPath(locale, "/contact") },
  ];

  // onDark — прозрачный с on-dark текстом — допустимо ТОЛЬКО на главной
  // в самом верху (когда под хедером ещё тёмная hero-фотография).
  // На остальных страницах хедер сразу cream c blur и бордюром.
  const lightBg = !isHome;
  const onDark = isHome && !scrolled;
  const showCream = lightBg || scrolled;

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        transition: "all 500ms var(--ease-out-expo)",
        background: showCream ? "rgba(245, 244, 238, 0.82)" : "transparent",
        backdropFilter: showCream ? "blur(18px) saturate(1.2)" : "none",
        WebkitBackdropFilter: showCream ? "blur(18px) saturate(1.2)" : "none",
        borderBottom: showCream
          ? "1px solid var(--border-subtle)"
          : "1px solid transparent",
      }}
    >
      <div
        className={onDark ? "on-dark" : ""}
        style={{
          maxWidth: "var(--max-w)",
          margin: "0 auto",
          padding: scrolled ? "14px var(--edge-d)" : "22px var(--edge-d)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 32,
          transition: "padding 500ms var(--ease-out-expo)",
        }}
      >
        {/* Brand */}
        <Link
          href={buildLocalizedPath(locale, "/")}
          style={{ display: "flex", alignItems: "center", gap: 12 }}
          onClick={() => setMenuOpen(false)}
        >
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={siteName} style={{ height: 32, width: "auto" }} />
          ) : (
            <Monogram size={32} gold />
          )}
          <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
            <span
              className="serif"
              style={{
                fontSize: 16,
                letterSpacing: "-0.015em",
                color: "var(--text-primary)",
              }}
            >
              {siteName}
            </span>
            <span
              style={{
                fontSize: 9.5,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "var(--accent)",
                fontWeight: 500,
              }}
            >
              Licensed Realtor
            </span>
          </span>
        </Link>

        {/* Center nav (desktop) */}
        <nav
          className="ed-nav-desktop"
          style={{
            display: "flex",
            gap: 36,
          }}
        >
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                letterSpacing: "0.01em",
                transition: "color 400ms var(--ease-out-expo)",
                paddingBottom: 2,
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "var(--text-primary)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--text-secondary)")
              }
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right utilities (desktop) */}
        <div
          className="ed-utils-desktop"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 12,
            letterSpacing: "0.04em",
          }}
        >
          {supportPhone ? (
            <a
              href={`tel:${supportPhone.replace(/\s+/g, "")}`}
              style={{
                fontSize: 12,
                letterSpacing: "0.02em",
                color: "var(--text-secondary)",
                whiteSpace: "nowrap",
              }}
            >
              {supportPhone}
            </a>
          ) : null}
          <LanguageSwitcher currentLocale={locale} label={dictionary.common.language} />
          <CurrencySwitcher label={dictionary.common.currency} />
          <span style={{ color: "var(--border-medium)" }}>·</span>

          {isAuthed ? (
            <div
              ref={userMenuRef}
              style={{ position: "relative" }}
            >
              <button
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "6px 8px 6px 6px",
                  background: "transparent",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 2,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  color: "var(--text-primary)",
                  letterSpacing: "0.01em",
                  fontSize: 12,
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
                    letterSpacing: "-0.01em",
                    fontStyle: "italic",
                    flexShrink: 0,
                  }}
                >
                  {initials}
                </span>
                <span style={{ whiteSpace: "nowrap" }}>{greeting}</span>
                <span
                  style={{
                    fontSize: 9,
                    color: "var(--text-tertiary)",
                    transform: userMenuOpen ? "rotate(180deg)" : "none",
                    transition: "transform 200ms",
                  }}
                >
                  ▾
                </span>
              </button>

              {userMenuOpen ? (
                <div
                  role="menu"
                  className="ed-light-panel"
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    right: 0,
                    minWidth: 240,
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-subtle)",
                    boxShadow: "0 16px 36px -12px rgba(11,11,12,0.18)",
                    zIndex: 30,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "14px 18px",
                      borderBottom: "1px solid var(--border-subtle)",
                    }}
                  >
                    <div
                      className="serif"
                      style={{
                        fontSize: 15,
                        color: "var(--text-primary)",
                        letterSpacing: "-0.015em",
                      }}
                    >
                      Welcome, {greeting}
                    </div>
                    {currentUserEmail ? (
                      <div
                        style={{
                          marginTop: 2,
                          fontSize: 11,
                          color: "var(--text-tertiary)",
                          letterSpacing: "0.02em",
                        }}
                      >
                        {currentUserEmail}
                      </div>
                    ) : null}
                  </div>
                  <UserMenuItem href={ROUTES.dashboard.root} label="Dashboard" />
                  <UserMenuItem
                    href={ROUTES.dashboard.home}
                    label="Home page"
                  />
                  <UserMenuItem
                    href={ROUTES.dashboard.properties}
                    label="Properties"
                  />
                  <UserMenuItem
                    href={ROUTES.dashboard.bookings}
                    label="Bookings"
                  />
                  <UserMenuItem
                    href={ROUTES.dashboard.crmLeads}
                    label="Leads"
                  />
                  <UserMenuItem
                    href={ROUTES.dashboard.messages}
                    label="Messages"
                  />
                  <UserMenuItem
                    href={ROUTES.dashboard.settings}
                    label="Settings"
                  />
                  <form action="/api/auth/sign-out" method="post">
                    <button
                      type="submit"
                      style={{
                        display: "block",
                        width: "100%",
                        padding: "12px 18px",
                        textAlign: "left",
                        fontSize: 13,
                        color: "var(--text-secondary)",
                        background: "transparent",
                        border: "none",
                        borderTop: "1px solid var(--border-subtle)",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        letterSpacing: "0.01em",
                        transition: "background 200ms, color 200ms",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--bg-secondary)";
                        e.currentTarget.style.color = "var(--text-primary)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "var(--text-secondary)";
                      }}
                    >
                      Sign out
                    </button>
                  </form>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <Link
                href={ROUTES.auth.signIn}
                style={{
                  color: "var(--text-primary)",
                  whiteSpace: "nowrap",
                  fontSize: 12,
                }}
              >
                Sign in
              </Link>
              <Link
                href={ROUTES.auth.signUp}
                className="btn btn-primary"
                style={{ padding: "10px 16px", fontSize: 12 }}
              >
                Sign up
              </Link>
            </>
          )}
        </div>

        {/* Burger (mobile) */}
        <button
          type="button"
          className="ed-burger"
          onClick={() => setMenuOpen((v) => !v)}
          style={{
            display: "none",
            width: 32,
            height: 32,
            position: "relative",
            background: "transparent",
            border: "none",
            cursor: "pointer",
          }}
          aria-label="Menu"
        >
          <span
            style={{
              position: "absolute",
              left: 4,
              right: 4,
              top: menuOpen ? "50%" : 10,
              height: 1,
              background: "var(--text-primary)",
              transform: menuOpen ? "rotate(45deg)" : "none",
              transition: "all 400ms var(--ease-out-expo)",
            }}
          />
          <span
            style={{
              position: "absolute",
              left: 4,
              right: 4,
              top: menuOpen ? "50%" : 20,
              height: 1,
              background: "var(--text-primary)",
              transform: menuOpen ? "rotate(-45deg)" : "none",
              transition: "all 400ms var(--ease-out-expo)",
            }}
          />
        </button>
      </div>

      {/* Mobile overlay */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "var(--bg-primary)",
          zIndex: 99,
          opacity: menuOpen ? 1 : 0,
          pointerEvents: menuOpen ? "auto" : "none",
          transition: "opacity 500ms var(--ease-out-expo)",
          display: "flex",
          flexDirection: "column",
          padding: "120px var(--edge-m) 40px",
        }}
      >
        <nav style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {navItems.map((item, i) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className="serif"
              style={{
                fontSize: "clamp(2rem, 8vw, 3.5rem)",
                color: "var(--text-primary)",
                letterSpacing: "-0.03em",
                padding: "8px 0",
                borderBottom: "1px solid var(--border-subtle)",
                transform: menuOpen ? "translateY(0)" : "translateY(20px)",
                opacity: menuOpen ? 1 : 0,
                transition: `all 700ms var(--ease-out-expo) ${i * 60 + 100}ms`,
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div
          style={{
            marginTop: "auto",
            display: "flex",
            gap: 16,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <LanguageSwitcher
            currentLocale={locale}
            label={dictionary.common.language}
          />
          <CurrencySwitcher label={dictionary.common.currency} />
          {isAuthed ? (
            <>
              <Link
                href={ROUTES.dashboard.root}
                onClick={() => setMenuOpen(false)}
                style={{ fontSize: 13, color: "var(--text-primary)" }}
              >
                Dashboard
              </Link>
              <form
                action="/api/auth/sign-out"
                method="post"
                style={{ marginLeft: "auto" }}
              >
                <button
                  type="submit"
                  className="btn btn-ghost"
                  style={{ padding: "10px 16px", fontSize: 12 }}
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href={ROUTES.auth.signIn}
                onClick={() => setMenuOpen(false)}
                style={{ fontSize: 13, color: "var(--text-primary)" }}
              >
                Sign in
              </Link>
              <Link
                href={ROUTES.auth.signUp}
                onClick={() => setMenuOpen(false)}
                className="btn btn-primary"
                style={{ marginLeft: "auto", padding: "10px 16px", fontSize: 12 }}
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .ed-nav-desktop, .ed-utils-desktop { display: none !important; }
          .ed-burger { display: inline-block !important; }
        }
      `}</style>
    </header>
  );
}

function UserMenuItem({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      role="menuitem"
      style={{
        display: "block",
        padding: "10px 18px",
        fontSize: 13,
        color: "var(--text-primary)",
        background: "transparent",
        textDecoration: "none",
        letterSpacing: "0.01em",
        transition: "background 200ms, color 200ms",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--bg-secondary)";
        e.currentTarget.style.color = "var(--accent)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = "var(--text-primary)";
      }}
    >
      {label}
    </Link>
  );
}
