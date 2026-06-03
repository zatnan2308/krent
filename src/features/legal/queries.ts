import { unstable_cache } from "next/cache";

import { createAdminClient } from "@/lib/supabase/server";

export interface LegalDocument {
  title: string | null;
  body: string | null;
}

const getLegalDocsCached = unstable_cache(
  async (organizationId: string): Promise<Record<string, LegalDocument>> => {
    const admin = createAdminClient();
    const { data } = await admin
      .from("legal_documents")
      .select("doc_key, title, body")
      .eq("organization_id", organizationId);
    const map: Record<string, LegalDocument> = {};
    for (const row of data ?? []) {
      map[row.doc_key] = { title: row.title, body: row.body };
    }
    return map;
  },
  ["legal-docs-by-org"],
  { revalidate: 60, tags: ["legal-docs"] },
);

/** Все юридические документы организации, ключ → документ. */
export async function getLegalDocuments(
  organizationId: string,
): Promise<Record<string, LegalDocument>> {
  return getLegalDocsCached(organizationId);
}

/** Один юридический документ организации (или null). */
export async function getLegalDocument(
  organizationId: string,
  docKey: string,
): Promise<LegalDocument | null> {
  const all = await getLegalDocuments(organizationId);
  return all[docKey] ?? null;
}
