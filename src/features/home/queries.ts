import { unstable_cache } from "next/cache";

import { createAdminClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type HomeHero = Tables<"home_hero">;
export type HomeAbout = Tables<"home_about">;
export type HomeCta = Tables<"home_cta">;
export type HomeMarket = Tables<"home_markets">;
export type HomeProcessStep = Tables<"home_process_steps">;
export type HomeTestimonial = Tables<"home_testimonials">;
export type HomeTrust = Tables<"home_trust_badges">;
export type HomePress = Tables<"home_press_logos">;
export type HomeSection = Tables<"home_sections">;
export type HomeIntentOption = Tables<"home_intent_options">;
export type HomeReason = Tables<"home_reasons">;
export type HomeStat = Tables<"home_stats">;

/** Заголовки секций главной, разложенные по section_key. */
export type HomeSectionsMap = Record<string, HomeSection | undefined>;

export interface HomeContent {
  hero: HomeHero | null;
  about: HomeAbout | null;
  cta: HomeCta | null;
  markets: HomeMarket[];
  process: HomeProcessStep[];
  testimonials: HomeTestimonial[];
  trust: HomeTrust[];
  press: HomePress[];
  /** Заголовки секций нового дизайна (intent/featured/why/communities/stories/subscribe). */
  sections: HomeSectionsMap;
  intent: HomeIntentOption[];
  reasons: HomeReason[];
  stats: HomeStat[];
}

/** Одним заходом тянет весь контент главной для организации.
 *  Закэширован на 60s по orgId — revalidateTag("home-content") из admin
 *  actions сбрасывает кэш сразу после сохранения. */
export const getHomeContent = unstable_cache(
  async function getHomeContentImpl(
    organizationId: string,
  ): Promise<HomeContent> {
    const admin = createAdminClient();
    const [
      hero,
      about,
      cta,
      markets,
      process,
      testimonials,
      trust,
      press,
      sections,
      intent,
      reasons,
      stats,
    ] = await Promise.all([
      admin
        .from("home_hero")
        .select("*")
        .eq("organization_id", organizationId)
        .maybeSingle(),
      admin
        .from("home_about")
        .select("*")
        .eq("organization_id", organizationId)
        .maybeSingle(),
      admin
        .from("home_cta")
        .select("*")
        .eq("organization_id", organizationId)
        .maybeSingle(),
      admin
        .from("home_markets")
        .select("*")
        .eq("organization_id", organizationId)
        .order("sort_order"),
      admin
        .from("home_process_steps")
        .select("*")
        .eq("organization_id", organizationId)
        .order("sort_order"),
      admin
        .from("home_testimonials")
        .select("*")
        .eq("organization_id", organizationId)
        .order("sort_order"),
      admin
        .from("home_trust_badges")
        .select("*")
        .eq("organization_id", organizationId)
        .order("sort_order"),
      admin
        .from("home_press_logos")
        .select("*")
        .eq("organization_id", organizationId)
        .order("sort_order"),
      admin
        .from("home_sections")
        .select("*")
        .eq("organization_id", organizationId),
      admin
        .from("home_intent_options")
        .select("*")
        .eq("organization_id", organizationId)
        .order("sort_order"),
      admin
        .from("home_reasons")
        .select("*")
        .eq("organization_id", organizationId)
        .order("sort_order"),
      admin
        .from("home_stats")
        .select("*")
        .eq("organization_id", organizationId)
        .order("sort_order"),
    ]);

    const sectionsMap: HomeSectionsMap = {};
    for (const section of sections.data ?? []) {
      sectionsMap[section.section_key] = section;
    }

    return {
      hero: hero.data,
      about: about.data,
      cta: cta.data,
      markets: markets.data ?? [],
      process: process.data ?? [],
      testimonials: testimonials.data ?? [],
      trust: trust.data ?? [],
      press: press.data ?? [],
      sections: sectionsMap,
      intent: intent.data ?? [],
      reasons: reasons.data ?? [],
      stats: stats.data ?? [],
    };
  },
  ["home-content-by-org"],
  { revalidate: 60, tags: ["home-content"] },
);
