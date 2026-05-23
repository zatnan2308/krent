import Link from "next/link";
import { Building2 } from "lucide-react";

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
}

export function PublicHeader({
  locale,
  dictionary,
  siteName,
  logoUrl,
}: PublicHeaderProps) {
  const navLinks = [
    {
      label: dictionary.nav.properties,
      href: buildLocalizedPath(locale, "/listings"),
    },
    {
      label: dictionary.nav.rentals,
      href: buildLocalizedPath(locale, "/rent"),
    },
    { label: dictionary.nav.about, href: buildLocalizedPath(locale, "/about") },
    {
      label: dictionary.nav.contact,
      href: buildLocalizedPath(locale, "/contact"),
    },
  ];

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link
          href={buildLocalizedPath(locale, "/")}
          className="flex items-center gap-2 font-semibold"
        >
          {logoUrl ? (
            // Логотип организации — произвольный URL, без оптимизации next/image.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={siteName} className="h-8 w-auto" />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Building2 className="h-5 w-5" />
            </span>
          )}
          {siteName}
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
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

        <div className="flex items-center gap-1">
          <LanguageSwitcher
            currentLocale={locale}
            label={dictionary.common.language}
          />
          <CurrencySwitcher label={dictionary.common.currency} />
          <Button asChild size="sm" className="ml-1">
            <Link href={ROUTES.auth.signIn}>{dictionary.common.signIn}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
