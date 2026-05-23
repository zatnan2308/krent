"use client";

import * as React from "react";
import Link from "next/link";
import { Building2, Menu, X } from "lucide-react";

import { CurrencySwitcher } from "@/components/shared/currency-switcher";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { Button } from "@/components/ui/button";
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
    { label: dictionary.nav.properties, href: buildLocalizedPath(locale, "/properties") },
    { label: "Buy", href: buildLocalizedPath(locale, "/buy") },
    { label: "Rent", href: buildLocalizedPath(locale, "/rent") },
    { label: "Vacation", href: buildLocalizedPath(locale, "/vacation-rentals") },
    { label: dictionary.nav.about, href: buildLocalizedPath(locale, "/about") },
    { label: dictionary.nav.contact, href: buildLocalizedPath(locale, "/contact") },
  ];

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link
          href={buildLocalizedPath(locale, "/")}
          className="flex items-center gap-2 font-semibold"
          onClick={() => setOpen(false)}
        >
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={siteName} className="h-8 w-auto" />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Building2 className="h-5 w-5" />
            </span>
          )}
          <span className="truncate">{siteName}</span>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-1 lg:flex">
          {supportPhone ? (
            <a
              href={`tel:${supportPhone.replace(/\s+/g, "")}`}
              className="mr-2 text-sm font-medium hover:underline"
            >
              {supportPhone}
            </a>
          ) : null}
          <LanguageSwitcher
            currentLocale={locale}
            label={dictionary.common.language}
          />
          <CurrencySwitcher label={dictionary.common.currency} />
          <Button asChild size="sm" className="ml-1">
            <Link href={ROUTES.auth.signIn}>{dictionary.common.signIn}</Link>
          </Button>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {open ? (
        <div className="lg:hidden">
          <nav className="container flex flex-col gap-1 border-t py-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm text-foreground hover:bg-accent"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-wrap items-center gap-2 border-t pt-3">
              {supportPhone ? (
                <a
                  href={`tel:${supportPhone.replace(/\s+/g, "")}`}
                  className="rounded-md border px-3 py-2 text-sm"
                >
                  {supportPhone}
                </a>
              ) : null}
              <LanguageSwitcher
                currentLocale={locale}
                label={dictionary.common.language}
              />
              <CurrencySwitcher label={dictionary.common.currency} />
              <Button asChild size="sm" className="ml-auto">
                <Link href={ROUTES.auth.signIn} onClick={() => setOpen(false)}>
                  {dictionary.common.signIn}
                </Link>
              </Button>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
