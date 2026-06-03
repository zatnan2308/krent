import type { Metadata } from "next";

import { DEFAULT_LEGAL } from "@/features/legal/defaults";
import { LegalPageView } from "@/features/legal/legal-page";
import { getLegalDocument } from "@/features/legal/queries";
import { getPublicSiteContext } from "@/server/public-site";

export const metadata: Metadata = { title: "Cookies" };
export const dynamic = "force-dynamic";

export default async function CookiesPage() {
  const site = await getPublicSiteContext();
  const doc = site
    ? await getLegalDocument(site.organization.id, "cookies")
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
