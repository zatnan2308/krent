import type { ReactNode } from "react";

import { CookieBanner } from "@/components/layout/cookie-banner";
import { PublicFooter } from "@/components/layout/public-footer";
import { PublicHeader } from "@/components/layout/public-header";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/i18n/dictionaries";

interface PublicLayoutProps {
  locale: Locale;
  dictionary: Dictionary;
  siteName: string;
  logoUrl: string | null;
  supportEmail?: string | null;
  supportPhone?: string | null;
  /** Имя текущего пользователя (для приветствия в хедере). */
  currentUserName?: string | null;
  currentUserEmail?: string | null;
  children: ReactNode;
}

export function PublicLayout({
  locale,
  dictionary,
  siteName,
  logoUrl,
  supportEmail,
  supportPhone,
  currentUserName,
  currentUserEmail,
  children,
}: PublicLayoutProps) {
  return (
    <div className="editorial flex min-h-screen flex-col">
      <div className="grain" />
      <PublicHeader
        locale={locale}
        dictionary={dictionary}
        siteName={siteName}
        logoUrl={logoUrl}
        supportPhone={supportPhone ?? null}
        currentUserName={currentUserName ?? null}
        currentUserEmail={currentUserEmail ?? null}
      />
      <main className="flex-1">{children}</main>
      <PublicFooter
        locale={locale}
        dictionary={dictionary}
        siteName={siteName}
        supportEmail={supportEmail ?? null}
        supportPhone={supportPhone ?? null}
      />
      <CookieBanner />
    </div>
  );
}
