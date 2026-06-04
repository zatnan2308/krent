import type { ReactNode } from "react";

import { CookieBanner } from "@/components/layout/cookie-banner";
import {
  ContactFab,
  ScrollTopButton,
} from "@/components/layout/floating-actions";
import { PublicFooter } from "@/components/layout/public-footer";
import { PublicHeader } from "@/components/layout/public-header";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/i18n/dictionaries";

/** Контактные данные, соцсети и тексты футера организации (из brand_settings). */
export interface SiteContactInfo {
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  messenger: string | null;
  address: string | null;
  hours: string | null;
  responseTime: string | null;
  footerTagline: string | null;
  newsletterTitle: string | null;
  newsletterBlurb: string | null;
  /** Готовые ссылки соцсетей (только заполненные). */
  socials: { label: string; href: string }[];
}

/** Готовая навигационная ссылка (label + локализованный href). */
export interface NavLink {
  label: string;
  href: string;
}

/** Пункт меню хедера с одним уровнем вложенности (дропдаун). */
export interface NavLinkNode {
  label: string;
  /** null — чистый родитель-дропдаун без собственной ссылки. */
  href: string | null;
  children: NavLink[];
}

interface PublicLayoutProps {
  locale: Locale;
  dictionary: Dictionary;
  siteName: string;
  logoUrl: string | null;
  /** Подзаголовок под брендом в хедере (white-label); null → дефолт. */
  headerTagline?: string | null;
  contact: SiteContactInfo;
  headerNav: NavLinkNode[];
  footerNav: NavLink[];
  /** Колонки футера (Browse/Areas/Legal); пустые → дефолты в футере. */
  footerBrowseNav?: NavLink[];
  footerAreasNav?: NavLink[];
  footerLegalNav?: NavLink[];
  /** Языки/валюты организации для нижней строки футера. */
  footerLocales?: string[];
  footerCurrencies?: string[];
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
  headerTagline,
  contact,
  headerNav,
  footerNav,
  footerBrowseNav,
  footerAreasNav,
  footerLegalNav,
  footerLocales,
  footerCurrencies,
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
        tagline={headerTagline}
        supportPhone={contact.phone}
        navItems={headerNav}
        currentUserName={currentUserName ?? null}
        currentUserEmail={currentUserEmail ?? null}
      />
      <main className="flex-1">{children}</main>
      <PublicFooter
        locale={locale}
        dictionary={dictionary}
        siteName={siteName}
        contact={contact}
        footerNav={footerNav}
        browseNav={footerBrowseNav}
        areasNav={footerAreasNav}
        legalNav={footerLegalNav}
        locales={footerLocales}
        currencies={footerCurrencies}
      />
      <CookieBanner />
      <ScrollTopButton />
      <ContactFab contact={contact} />
    </div>
  );
}
