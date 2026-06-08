import { unstable_cache } from "next/cache";

import {
  getContentTranslations,
  tr,
} from "@/lib/i18n/content-translations";
import { createAdminClient } from "@/lib/supabase/server";

export interface LegalDocument {
  title: string | null;
  body: string | null;
}

const getLegalDocsCached = unstable_cache(
  async (
    organizationId: string,
    locale: string,
    defaultLocale: string,
  ): Promise<Record<string, LegalDocument>> => {
    const admin = createAdminClient();
    const { data } = await admin
      .from("legal_documents")
      .select("doc_key, title, body")
      .eq("organization_id", organizationId);
    const translations = await getContentTranslations(
      organizationId,
      "legal_document",
      locale,
      defaultLocale,
    );
    const map: Record<string, LegalDocument> = {};
    for (const row of data ?? []) {
      const t = translations.get(row.doc_key) ?? {};
      map[row.doc_key] = {
        title: tr(row.title, t.title),
        body: tr(row.body, t.body),
      };
    }
    return map;
  },
  ["legal-docs-by-org"],
  { revalidate: 60, tags: ["legal-docs"] },
);

/**
 * Все юридические документы организации, ключ → документ. Контент локали
 * накладывается на язык по умолчанию (пустой перевод → база).
 */
export async function getLegalDocuments(
  organizationId: string,
  locale: string,
  defaultLocale: string,
): Promise<Record<string, LegalDocument>> {
  return getLegalDocsCached(organizationId, locale, defaultLocale);
}

/** Один юридический документ организации (или null). */
export async function getLegalDocument(
  organizationId: string,
  docKey: string,
  locale: string,
  defaultLocale: string,
): Promise<LegalDocument | null> {
  const all = await getLegalDocuments(organizationId, locale, defaultLocale);
  return all[docKey] ?? null;
}
