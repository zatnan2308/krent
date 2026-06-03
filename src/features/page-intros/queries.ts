import { unstable_cache } from "next/cache";

import { createAdminClient } from "@/lib/supabase/server";

export interface PageIntro {
  eyebrow: string | null;
  heading: string | null;
  subheading: string | null;
}

const getPageIntrosCached = unstable_cache(
  async (organizationId: string): Promise<Record<string, PageIntro>> => {
    const admin = createAdminClient();
    const { data } = await admin
      .from("page_intros")
      .select("page_key, eyebrow, heading, subheading")
      .eq("organization_id", organizationId);
    const map: Record<string, PageIntro> = {};
    for (const row of data ?? []) {
      map[row.page_key] = {
        eyebrow: row.eyebrow,
        heading: row.heading,
        subheading: row.subheading,
      };
    }
    return map;
  },
  ["page-intros-by-org"],
  { revalidate: 60, tags: ["page-intros"] },
);

/** Все вступительные блоки страниц организации, ключ → intro. */
export async function getPageIntros(
  organizationId: string,
): Promise<Record<string, PageIntro>> {
  return getPageIntrosCached(organizationId);
}

/** Вступительный блок одной страницы (или null). */
export async function getPageIntro(
  organizationId: string,
  pageKey: string,
): Promise<PageIntro | null> {
  const all = await getPageIntros(organizationId);
  return all[pageKey] ?? null;
}
