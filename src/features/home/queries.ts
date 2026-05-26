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

export interface HomeContent {
  hero: HomeHero | null;
  about: HomeAbout | null;
  cta: HomeCta | null;
  markets: HomeMarket[];
  process: HomeProcessStep[];
  testimonials: HomeTestimonial[];
  trust: HomeTrust[];
  press: HomePress[];
}

/** Одним запросом тянет весь контент главной для организации.
 *  Закэширован на 60s по orgId — revalidatePath из admin actions сбрасывает кэш. */
export const getHomeContent = unstable_cache(
  async function getHomeContentImpl(
    organizationId: string,
  ): Promise<HomeContent> {
    const admin = createAdminClient();
    const [hero, about, cta, markets, process, testimonials, trust, press] =
      await Promise.all([
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
      ]);
    return {
      hero: hero.data,
      about: about.data,
      cta: cta.data,
      markets: markets.data ?? [],
      process: process.data ?? [],
      testimonials: testimonials.data ?? [],
      trust: trust.data ?? [],
      press: press.data ?? [],
    };
  },
  ["home-content-by-org"],
  { revalidate: 60, tags: ["home-content"] },
);
