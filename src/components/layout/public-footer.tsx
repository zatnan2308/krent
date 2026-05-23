import Link from "next/link";

import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { buildLocalizedPath } from "@/lib/seo";

interface PublicFooterProps {
  locale: Locale;
  dictionary: Dictionary;
  siteName: string;
  supportEmail?: string | null;
  supportPhone?: string | null;
}

export function PublicFooter({
  locale,
  dictionary,
  siteName,
  supportEmail,
  supportPhone,
}: PublicFooterProps) {
  const sections: { title: string; links: { label: string; href: string }[] }[] = [
    {
      title: "Browse",
      links: [
        { label: "All properties", href: buildLocalizedPath(locale, "/properties") },
        { label: "Buy", href: buildLocalizedPath(locale, "/buy") },
        { label: "Rent", href: buildLocalizedPath(locale, "/rent") },
        { label: "Vacation", href: buildLocalizedPath(locale, "/vacation-rentals") },
      ],
    },
    {
      title: "Company",
      links: [
        { label: dictionary.nav.about, href: buildLocalizedPath(locale, "/about") },
        { label: dictionary.nav.contact, href: buildLocalizedPath(locale, "/contact") },
        { label: "Agents", href: buildLocalizedPath(locale, "/agents") },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Privacy policy", href: buildLocalizedPath(locale, "/privacy") },
        { label: "Terms of service", href: buildLocalizedPath(locale, "/terms") },
        { label: "Cookies", href: buildLocalizedPath(locale, "/cookies") },
      ],
    },
  ];

  return (
    <footer className="border-t bg-muted/30">
      <div className="container py-10">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <p className="text-base font-semibold">{siteName}</p>
            {supportEmail ? (
              <p className="mt-2 text-sm text-muted-foreground">
                <a href={`mailto:${supportEmail}`} className="hover:underline">
                  {supportEmail}
                </a>
              </p>
            ) : null}
            {supportPhone ? (
              <p className="text-sm text-muted-foreground">
                <a
                  href={`tel:${supportPhone.replace(/\s+/g, "")}`}
                  className="hover:underline"
                >
                  {supportPhone}
                </a>
              </p>
            ) : null}
          </div>
          {sections.map((section) => (
            <div key={section.title}>
              <p className="text-sm font-semibold">{section.title}</p>
              <ul className="mt-2 space-y-1">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-8 border-t pt-4 text-xs text-muted-foreground">
          {"©"} {new Date().getFullYear()} {siteName}. {dictionary.footer.rights}
        </p>
      </div>
    </footer>
  );
}
