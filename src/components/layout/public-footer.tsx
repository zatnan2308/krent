import Link from "next/link";

import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { buildLocalizedPath } from "@/lib/seo";

interface PublicFooterProps {
  locale: Locale;
  dictionary: Dictionary;
  siteName: string;
}

export function PublicFooter({
  locale,
  dictionary,
  siteName,
}: PublicFooterProps) {
  const footerLinks = [
    {
      label: dictionary.nav.properties,
      href: buildLocalizedPath(locale, "/properties"),
    },
    {
      label: dictionary.nav.rentals,
      href: buildLocalizedPath(locale, "/rentals"),
    },
    { label: dictionary.nav.about, href: buildLocalizedPath(locale, "/about") },
    {
      label: dictionary.nav.contact,
      href: buildLocalizedPath(locale, "/contact"),
    },
  ];

  return (
    <footer className="border-t bg-muted/30">
      <div className="container flex flex-col gap-4 py-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {"©"} 2026 {siteName}. {dictionary.footer.rights}
        </p>
        <nav className="flex flex-wrap gap-x-6 gap-y-2">
          {footerLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
