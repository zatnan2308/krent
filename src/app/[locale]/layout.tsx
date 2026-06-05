import type { ReactNode } from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import {
  PublicLayout,
  type NavLink,
  type NavLinkNode,
  type SiteContactInfo,
} from "@/components/layout/public-layout";
import { AnalyticsTracker } from "@/features/analytics/tracker";
import { getPublicTrackingConfig } from "@/features/analytics/queries";
import {
  getPublicNavigation,
  getPublicNavigationTree,
  type PublicNavTreeItem,
} from "@/features/cms/navigation-queries";
import { AttributionTracker } from "@/features/crm/attribution-tracker";
import { DEFAULT_BRANDING } from "@/lib/branding";
import { DEFAULT_LOCALE, isLocale, LOCALES, type Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { buildLocalizedPath } from "@/lib/seo";
import { getCurrentUserShallow } from "@/server/auth";
import { getPublicSiteContext } from "@/server/public-site";

// Публичный сайт зависит от домена (организация-арендатор) — рендер динамический.
export const dynamic = "force-dynamic";

/** Нормализует значение WhatsApp (номер или ссылка) в кликабельный URL. */
function whatsappLink(value: string): string {
  if (value.startsWith("http")) return value;
  const digits = value.replace(/[^\d]/g, "");
  return digits ? `https://wa.me/${digits}` : value;
}

/**
 * Site-wide мета: верификация Google Search Console + дефолтный заголовок
 * из seo_settings. `title.default` подхватывают только страницы без своего
 * title (страницы через buildPageMetadata уже сами прибавляют title_suffix —
 * поэтому НЕ задаём template, иначе суффикс задвоится).
 */
export async function generateMetadata(): Promise<Metadata> {
  const site = await getPublicSiteContext();
  const metadata: Metadata = {};
  const google = site?.seo?.google_site_verification?.trim();
  if (google) {
    metadata.verification = { google };
  }
  const defaultTitle = site?.seo?.default_title?.trim();
  if (defaultTitle) {
    const suffix = site?.seo?.title_suffix ?? "";
    // Плоская строка-title на уровне layout — дефолт для страниц без своего
    // title; дочерние страницы её переопределяют (без template — без задвоения
    // suffix, который страницы через buildPageMetadata уже прибавляют сами).
    metadata.title = `${defaultTitle}${suffix}`;
  }
  return metadata;
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  const localeParam = params.locale;
  if (!isLocale(localeParam)) {
    notFound();
  }

  const [site, user] = await Promise.all([
    getPublicSiteContext(),
    getCurrentUserShallow(),
  ]);

  // Языки, реально включённые в организации (fallback — весь каталог, если
  // организация не резолвится: неизвестный домен / локальная разработка).
  const enabledLocales = (site?.organization.enabled_languages ?? []).filter(
    isLocale,
  );
  const availableLocales: Locale[] =
    enabledLocales.length > 0 ? enabledLocales : [...LOCALES];
  const defaultLang: Locale =
    site && isLocale(site.organization.default_language)
      ? site.organization.default_language
      : DEFAULT_LOCALE;
  // Основной язык ОБЯЗАН быть среди доступных — иначе редирект ниже зациклится
  // (страховка от рассинхрона default_language ∉ enabled_languages в данных).
  const primaryLocale: Locale = availableLocales.includes(defaultLang)
    ? defaultLang
    : availableLocales[0] ?? DEFAULT_LOCALE;

  // Запрошенный язык выключен в организации → редирект на основной язык,
  // сохраняя остаток пути (x-pathname проставляет middleware).
  if (enabledLocales.length > 0 && !availableLocales.includes(localeParam)) {
    const pathname = headers().get("x-pathname") ?? `/${localeParam}`;
    const rest = pathname.replace(/^\/[^/]+/, "");
    redirect(`/${primaryLocale}${rest}`);
  }

  const locale = localeParam;
  const dictionary = getDictionary(locale);
  const siteName = site?.organization.name ?? DEFAULT_BRANDING.appName;
  const logoUrl = site?.brand?.logo_url ?? null;

  // Контакты, соцсети и тексты футера организации (brand_settings).
  const brand = site?.brand ?? null;
  const socials: { label: string; href: string }[] = [];
  if (brand?.social_instagram)
    socials.push({ label: "Instagram", href: brand.social_instagram });
  if (brand?.social_linkedin)
    socials.push({ label: "LinkedIn", href: brand.social_linkedin });
  if (brand?.social_facebook)
    socials.push({ label: "Facebook", href: brand.social_facebook });
  if (brand?.social_x) socials.push({ label: "X", href: brand.social_x });
  if (brand?.social_youtube)
    socials.push({ label: "YouTube", href: brand.social_youtube });
  if (brand?.contact_whatsapp)
    socials.push({
      label: "WhatsApp",
      href: whatsappLink(brand.contact_whatsapp),
    });
  const contact: SiteContactInfo = {
    email: brand?.contact_email ?? null,
    phone: brand?.contact_phone ?? null,
    whatsapp: brand?.contact_whatsapp ?? null,
    messenger: brand?.contact_messenger ?? null,
    address: brand?.contact_address ?? null,
    hours: brand?.office_hours ?? null,
    responseTime: brand?.response_time ?? null,
    footerTagline: brand?.footer_tagline ?? null,
    newsletterTitle: brand?.newsletter_title ?? null,
    newsletterBlurb: brand?.newsletter_blurb ?? null,
    socials,
  };
  const trackingConfig = site
    ? await getPublicTrackingConfig(site.organization.id)
    : null;

  // Навигация header/footer из БД (относительные URL локализуются).
  const localizeHref = (url: string): string =>
    url.startsWith("http") ? url : buildLocalizedPath(locale, url);
  const localizeNav = (items: { label: string; url: string }[]): NavLink[] =>
    items.map((item) => ({ label: item.label, href: localizeHref(item.url) }));
  // Хедер — дерево с дропдаунами (один уровень вложенности).
  const localizeNavTree = (items: PublicNavTreeItem[]): NavLinkNode[] =>
    items.map((item) => ({
      label: item.label,
      href: item.url ? localizeHref(item.url) : null,
      children: item.children.map((child) => ({
        label: child.label,
        href: localizeHref(child.url),
      })),
    }));
  const [headerNav, footerNav, browseNav, areasNav, legalNav]: [
    NavLinkNode[],
    NavLink[],
    NavLink[],
    NavLink[],
    NavLink[],
  ] = site
    ? await Promise.all([
        getPublicNavigationTree(site.organization.id, "header").then(
          localizeNavTree,
        ),
        getPublicNavigation(site.organization.id, "footer").then(localizeNav),
        getPublicNavigation(site.organization.id, "footer_browse").then(
          localizeNav,
        ),
        getPublicNavigation(site.organization.id, "footer_areas").then(
          localizeNav,
        ),
        getPublicNavigation(site.organization.id, "footer_legal").then(
          localizeNav,
        ),
      ])
    : [[], [], [], [], []];

  // Имя для приветствия — из user_metadata.full_name либо часть email.
  let userName: string | null = null;
  let userEmail: string | null = null;
  if (user) {
    userEmail = user.email ?? null;
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const meta_name =
      (typeof meta.full_name === "string" && meta.full_name.trim()) ||
      (typeof meta.name === "string" && meta.name.trim()) ||
      "";
    userName = meta_name || (userEmail ? userEmail.split("@")[0]! : null);
  }

  return (
    <>
      <AttributionTracker />
      {trackingConfig ? (
        <AnalyticsTracker config={trackingConfig} />
      ) : null}
      <PublicLayout
        locale={locale}
        dictionary={dictionary}
        siteName={siteName}
        logoUrl={logoUrl}
        headerTagline={brand?.header_tagline ?? null}
        contact={contact}
        headerNav={headerNav}
        footerNav={footerNav}
        footerBrowseNav={browseNav}
        footerAreasNav={areasNav}
        footerLegalNav={legalNav}
        availableLocales={availableLocales}
        footerLocales={site?.organization.enabled_languages}
        footerCurrencies={site?.organization.enabled_currencies}
        currentUserName={userName}
        currentUserEmail={userEmail}
      >
        {children}
      </PublicLayout>
    </>
  );
}
