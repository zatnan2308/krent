import { unstable_cache } from "next/cache";

import {
  getContentTranslations,
  tr,
} from "@/lib/i18n/content-translations";
import { createAdminClient } from "@/lib/supabase/server";

export interface PageIntro {
  eyebrow: string | null;
  heading: string | null;
  subheading: string | null;
}

const getPageIntrosCached = unstable_cache(
  async (
    organizationId: string,
    locale: string,
    defaultLocale: string,
  ): Promise<Record<string, PageIntro>> => {
    const admin = createAdminClient();
    const { data } = await admin
      .from("page_intros")
      .select("page_key, eyebrow, heading, subheading")
      .eq("organization_id", organizationId);
    const translations = await getContentTranslations(
      organizationId,
      "page_intro",
      locale,
      defaultLocale,
    );
    const map: Record<string, PageIntro> = {};
    for (const row of data ?? []) {
      const t = translations.get(row.page_key) ?? {};
      map[row.page_key] = {
        eyebrow: tr(row.eyebrow, t.eyebrow),
        heading: tr(row.heading, t.heading),
        subheading: tr(row.subheading, t.subheading),
      };
    }
    return map;
  },
  ["page-intros-by-org"],
  { revalidate: 60, tags: ["page-intros"] },
);

/**
 * Все вступительные блоки страниц организации, ключ → intro. Контент
 * локали накладывается на язык по умолчанию (пустой перевод → база).
 */
export async function getPageIntros(
  organizationId: string,
  locale: string,
  defaultLocale: string,
): Promise<Record<string, PageIntro>> {
  return getPageIntrosCached(organizationId, locale, defaultLocale);
}

/** Вступительный блок одной страницы (или null). */
export async function getPageIntro(
  organizationId: string,
  pageKey: string,
  locale: string,
  defaultLocale: string,
): Promise<PageIntro | null> {
  const all = await getPageIntros(organizationId, locale, defaultLocale);
  return all[pageKey] ?? null;
}
