import { unstable_cache } from "next/cache";

import {
  getContentTranslations,
  tr,
} from "@/lib/i18n/content-translations";
import { createAdminClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export interface AboutContent {
  page: Tables<"about_page"> | null;
  milestones: Tables<"about_milestones">[];
}

const getAboutContentCached = unstable_cache(
  async (
    organizationId: string,
    locale: string,
    defaultLocale: string,
  ): Promise<AboutContent> => {
    const admin = createAdminClient();
    const [pageResult, milestonesResult] = await Promise.all([
      admin
        .from("about_page")
        .select("*")
        .eq("organization_id", organizationId)
        .maybeSingle(),
      admin
        .from("about_milestones")
        .select("*")
        .eq("organization_id", organizationId)
        .order("sort_order", { ascending: true }),
    ]);
    const [pageTr, milestoneTr] = await Promise.all([
      getContentTranslations(organizationId, "about_page", locale, defaultLocale),
      getContentTranslations(
        organizationId,
        "about_milestone",
        locale,
        defaultLocale,
      ),
    ]);

    const basePage = pageResult.data;
    const pt = pageTr.get("") ?? {};
    const page: Tables<"about_page"> | null = basePage
      ? {
          ...basePage,
          hero_title: tr(basePage.hero_title, pt.hero_title),
          story_heading: tr(basePage.story_heading, pt.story_heading),
          story_body: tr(basePage.story_body, pt.story_body),
          quote_1: tr(basePage.quote_1, pt.quote_1),
          quote_2: tr(basePage.quote_2, pt.quote_2),
        }
      : null;

    const milestones = (milestonesResult.data ?? []).map((m) => {
      const mt = milestoneTr.get(m.id) ?? {};
      return {
        ...m,
        year: tr(m.year, mt.year) ?? m.year,
        title: tr(m.title, mt.title) ?? m.title,
        body: tr(m.body, mt.body) ?? m.body,
      };
    });

    return { page, milestones };
  },
  ["about-content-by-org"],
  { revalidate: 60, tags: ["about-content"] },
);

/**
 * Редактируемый контент страницы /about (тексты + вехи). Контент локали
 * накладывается на язык по умолчанию (пустой перевод → база).
 */
export async function getAboutContent(
  organizationId: string,
  locale: string,
  defaultLocale: string,
): Promise<AboutContent> {
  return getAboutContentCached(organizationId, locale, defaultLocale);
}
