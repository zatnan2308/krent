import type { ReactNode } from "react";

import { PublicFooter } from "@/components/layout/public-footer";
import { PublicHeader } from "@/components/layout/public-header";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/i18n/dictionaries";

interface PublicLayoutProps {
  locale: Locale;
  dictionary: Dictionary;
  siteName: string;
  logoUrl: string | null;
  children: ReactNode;
}

export function PublicLayout({
  locale,
  dictionary,
  siteName,
  logoUrl,
  children,
}: PublicLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader
        locale={locale}
        dictionary={dictionary}
        siteName={siteName}
        logoUrl={logoUrl}
      />
      <main className="flex-1">{children}</main>
      <PublicFooter locale={locale} dictionary={dictionary} siteName={siteName} />
    </div>
  );
}
