import type { Metadata } from "next";
import { notFound, permanentRedirect, redirect } from "next/navigation";

import { buildPageMetadata } from "@/features/cms/metadata";
import { PageRenderer } from "@/features/cms/page-renderer";
import { getPublishedPage, getRedirect } from "@/features/cms/queries";
import { isLocale, type Locale } from "@/lib/i18n";
import { getPublicSiteContext } from "@/server/public-site";

export const dynamic = "force-dynamic";

function resolveLocale(value: string): Locale {
  return isLocale(value) ? value : "en";
}

export async function generateMetadata({
  params,
}: {
  params: { locale: string; slug: string[] };
}): Promise<Metadata> {
  const locale = resolveLocale(params.locale);
  const site = await getPublicSiteContext();
  if (!site) {
    return {};
  }

  const slug = params.slug.join("/");
  const page = await getPublishedPage(
    site.organization.id,
    slug,
    locale,
    site.organization.default_language,
  );
  if (!page) {
    return {};
  }

  return buildPageMetadata(page, site, locale, `/${slug}`);
}

export default async function CmsPage({
  params,
}: {
  params: { locale: string; slug: string[] };
}) {
  const locale = resolveLocale(params.locale);
  const site = await getPublicSiteContext();
  if (!site) {
    notFound();
  }

  const slug = params.slug.join("/");
  const page = await getPublishedPage(
    site.organization.id,
    slug,
    locale,
    site.organization.default_language,
  );

  if (!page) {
    // Страница не найдена — проверяем редиректы организации.
    const redirectRow = await getRedirect(site.organization.id, `/${slug}`);
    if (redirectRow) {
      if (redirectRow.status_code === 301 || redirectRow.status_code === 308) {
        permanentRedirect(redirectRow.destination_path);
      }
      redirect(redirectRow.destination_path);
    }
    notFound();
  }

  return (
    <article
      style={{
        maxWidth: "var(--max-w)",
        margin: "0 auto",
        padding: "clamp(48px, 7vw, 96px) var(--edge-d)",
      }}
    >
      <h1
        className="serif"
        style={{
          fontSize: "clamp(2.25rem, 5vw, 3.5rem)",
          letterSpacing: "-0.02em",
          lineHeight: 1.05,
          fontWeight: 400,
          color: "var(--text-primary)",
          marginBottom: "clamp(28px, 4vw, 44px)",
          textWrap: "balance",
        }}
      >
        {page.translation.title}
      </h1>
      <PageRenderer content={page.content} />
    </article>
  );
}
