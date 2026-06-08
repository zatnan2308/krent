import type { Metadata } from "next";

import { DEFAULT_LEGAL } from "@/features/legal/defaults";
import { LegalPageView } from "@/features/legal/legal-page";
import { getLegalDocument } from "@/features/legal/queries";
import { isLocale, type Locale } from "@/lib/i18n";
import { getPublicSiteContext } from "@/server/public-site";

export const metadata: Metadata = { title: "Cookies" };
export const dynamic = "force-dynamic";

function resolveLocale(value: string): Locale {
  return isLocale(value) ? value : "en";
}

export default async function CookiesPage({
  params,
}: {
  params: { locale: string };
}) {
  const locale = resolveLocale(params.locale);
  const site = await getPublicSiteContext();
  const doc = site
    ? await getLegalDocument(
        site.organization.id,
        "cookies",
        locale,
        site.organization.default_language,
      )
    : null;
  const def = DEFAULT_LEGAL.cookies;
  return (
    <LegalPageView
      eyebrow="Cookies"
      title={doc?.title || def.title}
      body={doc?.body || def.body}
    />
  );
}
