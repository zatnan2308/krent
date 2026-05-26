"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

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
}

export function PublicHeader({
  locale,
  dictionary,
  siteName,
  logoUrl,
  supportPhone,
}: PublicHeaderProps) {
  const [open, setOpen] = React.useState(false);
  const navLinks = [
    { label: "Properties", href: buildLocalizedPath(locale, "/properties") },
    { label: "Markets", href: buildLocalizedPath(locale, "/listings") },
    { label: "About", href: buildLocalizedPath(locale, "/about") },
    { label: "Contact", href: buildLocalizedPath(locale, "/contact") },
  ];

  return (
    <header
      className="sticky top-0 z-30 border-b backdrop-blur"
      style={{
        background: "rgba(245, 244, 238, 0.85)",
        borderColor: "var(--ed-border)",
      }}
    >
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-5 sm:px-8">
        <Link
          href={buildLocalizedPath(locale, "/")}
          className="flex items-center gap-3"
          onClick={() => setOpen(false)}
        >
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={siteName} className="h-7 w-auto" />
          ) : (
            <span className="ed-serif text-lg italic" style={{ color: "var(--ed-accent)" }}>
              AK
            </span>
          )}
          <span className="ed-serif text-sm tracking-tight" style={{ color: "var(--ed-text)" }}>
            {siteName}
          </span>
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[13px] tracking-wide transition-colors hover:text-[var(--ed-accent)]"
              style={{ color: "var(--ed-text-2)" }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {supportPhone ? (
            <a
              href={`tel:${supportPhone.replace(/\s+/g, "")}`}
              className="text-[13px] tracking-wide"
              style={{ color: "var(--ed-text-2)" }}
            >
              {supportPhone}
            </a>
          ) : null}
          <LanguageSwitcher currentLocale={locale} label={dictionary.common.language} />
          <CurrencySwitcher label={dictionary.common.currency} />
          <Link
            href={ROUTES.auth.signIn}
            className="text-[13px] tracking-wide hover:text-[var(--ed-accent)]"
            style={{ color: "var(--ed-text-2)" }}
          >
            Sign in
          </Link>
          <Link href={ROUTES.auth.signUp} className="ed-btn">
            Sign up
          </Link>
        </div>

        <button
          type="button"
          className="rounded-md p-2 lg:hidden"
          aria-label="Menu"
          onClick={() => setOpen((v) => !v)}
          style={{ color: "var(--ed-text)" }}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <div className="border-t lg:hidden" style={{ borderColor: "var(--ed-border)" }}>
          <nav className="mx-auto flex max-w-[1440px] flex-col gap-1 px-5 py-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm"
                style={{ color: "var(--ed-text)" }}
              >
                {link.label}
              </Link>
            ))}
            <div
              className="mt-2 flex flex-wrap items-center gap-2 border-t pt-3"
              style={{ borderColor: "var(--ed-border)" }}
            >
              <LanguageSwitcher currentLocale={locale} label={dictionary.common.language} />
              <CurrencySwitcher label={dictionary.common.currency} />
              <Link
                href={ROUTES.auth.signIn}
                onClick={() => setOpen(false)}
                className="rounded-md border px-3 py-2 text-sm"
                style={{ borderColor: "var(--ed-border)", color: "var(--ed-text)" }}
              >
                Sign in
              </Link>
              <Link
                href={ROUTES.auth.signUp}
                onClick={() => setOpen(false)}
                className="ed-btn ml-auto"
              >
                Sign up
              </Link>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
