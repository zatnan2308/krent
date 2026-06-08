import { unstable_cache } from "next/cache";

import { tr } from "@/lib/i18n/content-translations";
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

// ---- Переводы контента главной ----------------------------------
// Все переводы home_* для локали лежат в content_translations и
// накладываются на базовый контент: на публичном сайте — с fallback на
// базу (mode "public"), в редакторе — сырьём (mode "editor": пустое поле,
// если перевода нет, чтобы админ заполнил его, а не скопировал базу).

type RawFields = Record<string, unknown>;
export type HomeTranslationMap = Map<string, RawFields>;
type Mode = "public" | "editor";

/** Комбинирует строковое поле базы и перевода по режиму. */
function cs<T extends string | null>(base: T, t: unknown, mode: Mode): T {
  const tv = typeof t === "string" && t.trim() !== "" ? t : null;
  if (mode === "public") {
    return tr(base, tv) as T;
  }
  // editor: показываем сырой перевод, пусто — если перевода нет.
  if (tv) return tv as T;
  return (base === null ? null : "") as T;
}

/** Все переводы home_* организации для локали: ключ `${type}:${key}`. */
export async function getHomeTranslationMap(
  organizationId: string,
  locale: string,
  defaultLocale: string,
): Promise<HomeTranslationMap> {
  const map: HomeTranslationMap = new Map();
  if (!locale || locale === defaultLocale) {
    return map;
  }
  const admin = createAdminClient();
  const { data } = await admin
    .from("content_translations")
    .select("entity_type, entity_key, fields")
    .eq("organization_id", organizationId)
    .like("entity_type", "home\\_%")
    .eq("locale", locale);
  for (const row of data ?? []) {
    map.set(
      `${row.entity_type}:${row.entity_key}`,
      (row.fields ?? {}) as RawFields,
    );
  }
  return map;
}

/**
 * Накладывает переводы на базовый контент главной. mode "public" —
 * fallback на базу; mode "editor" — сырьё (для языковых вкладок редактора).
 */
export function applyHomeTranslations(
  content: HomeContent,
  map: HomeTranslationMap,
  mode: Mode,
): HomeContent {
  if (map.size === 0) {
    return content;
  }
  const get = (type: string, key: string): RawFields => map.get(`${type}:${key}`) ?? {};

  const hero = content.hero
    ? (() => {
        const t = get("home_hero", "");
        const chips =
          Array.isArray(t.eyebrow_chips) && t.eyebrow_chips.length > 0
            ? (t.eyebrow_chips as string[])
            : content.hero!.eyebrow_chips;
        return {
          ...content.hero!,
          eyebrow_text: cs(content.hero!.eyebrow_text, t.eyebrow_text, mode),
          eyebrow_chips: chips,
          headline_top: cs(content.hero!.headline_top, t.headline_top, mode),
          headline_bottom_italic: cs(
            content.hero!.headline_bottom_italic,
            t.headline_bottom_italic,
            mode,
          ),
          subtitle: cs(content.hero!.subtitle, t.subtitle, mode),
          primary_cta_label: cs(
            content.hero!.primary_cta_label,
            t.primary_cta_label,
            mode,
          ),
          secondary_cta_label: cs(
            content.hero!.secondary_cta_label,
            t.secondary_cta_label,
            mode,
          ),
        };
      })()
    : null;

  const about = content.about
    ? (() => {
        const t = get("home_about", "");
        const a = content.about!;
        return {
          ...a,
          eyebrow_text: cs(a.eyebrow_text, t.eyebrow_text, mode),
          headline: cs(a.headline, t.headline, mode),
          body: cs(a.body, t.body, mode),
          headline_accent: cs(a.headline_accent, t.headline_accent, mode),
          headline_suffix: cs(a.headline_suffix, t.headline_suffix, mode),
          body_2: cs(a.body_2, t.body_2, mode),
          cta_label: cs(a.cta_label, t.cta_label, mode),
          metric_1_label: cs(a.metric_1_label, t.metric_1_label, mode),
          metric_2_label: cs(a.metric_2_label, t.metric_2_label, mode),
          metric_3_label: cs(a.metric_3_label, t.metric_3_label, mode),
          metric_4_label: cs(a.metric_4_label, t.metric_4_label, mode),
        };
      })()
    : null;

  const cta = content.cta
    ? (() => {
        const t = get("home_cta", "");
        const c = content.cta!;
        return {
          ...c,
          eyebrow_text: cs(c.eyebrow_text, t.eyebrow_text, mode),
          headline_left: cs(c.headline_left, t.headline_left, mode),
          headline_italic: cs(c.headline_italic, t.headline_italic, mode),
          headline_right: cs(c.headline_right, t.headline_right, mode),
          subtitle: cs(c.subtitle, t.subtitle, mode),
          primary_cta_label: cs(c.primary_cta_label, t.primary_cta_label, mode),
          secondary_cta_label: cs(
            c.secondary_cta_label,
            t.secondary_cta_label,
            mode,
          ),
        };
      })()
    : null;

  const sections: HomeSectionsMap = {};
  for (const [key, section] of Object.entries(content.sections)) {
    if (!section) continue;
    const t = get("home_section", key);
    sections[key] = {
      ...section,
      eyebrow: cs(section.eyebrow, t.eyebrow, mode),
      lead: cs(section.lead, t.lead, mode),
      accent: cs(section.accent, t.accent, mode),
      subtitle: cs(section.subtitle, t.subtitle, mode),
    };
  }

  const markets = content.markets.map((m) => {
    const t = get("home_market", m.id);
    return {
      ...m,
      name: cs(m.name, t.name, mode),
      region: cs(m.region, t.region, mode),
      badge: cs(m.badge, t.badge, mode),
      blurb: cs(m.blurb, t.blurb, mode),
    };
  });

  const process = content.process.map((p) => {
    const t = get("home_process", p.id);
    return {
      ...p,
      title: cs(p.title, t.title, mode),
      body: cs(p.body, t.body, mode),
    };
  });

  const testimonials = content.testimonials.map((x) => {
    const t = get("home_testimonial", x.id);
    return {
      ...x,
      quote: cs(x.quote, t.quote, mode),
      deal_label: cs(x.deal_label, t.deal_label, mode),
    };
  });

  const trust = content.trust.map((x) => {
    const t = get("home_trust", x.id);
    return {
      ...x,
      label: cs(x.label, t.label, mode),
      sub: cs(x.sub, t.sub, mode),
    };
  });

  const intent = content.intent.map((x) => {
    const t = get("home_intent", x.id);
    return {
      ...x,
      title: cs(x.title, t.title, mode),
      description: cs(x.description, t.description, mode),
    };
  });

  const reasons = content.reasons.map((x) => {
    const t = get("home_reason", x.id);
    return {
      ...x,
      title: cs(x.title, t.title, mode),
      body: cs(x.body, t.body, mode),
    };
  });

  const stats = content.stats.map((x) => {
    const t = get("home_stat", x.id);
    return { ...x, label: cs(x.label, t.label, mode) };
  });

  return {
    hero,
    about,
    cta,
    markets,
    process,
    testimonials,
    trust,
    press: content.press,
    sections,
    intent,
    reasons,
    stats,
  };
}

const getHomeContentCached = unstable_cache(
  async function getHomeContentImpl(
    organizationId: string,
    locale: string,
    defaultLocale: string,
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

    const base: HomeContent = {
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

    if (locale === defaultLocale) {
      return base;
    }
    const map = await getHomeTranslationMap(
      organizationId,
      locale,
      defaultLocale,
    );
    return applyHomeTranslations(base, map, "public");
  },
  ["home-content-by-org"],
  { revalidate: 60, tags: ["home-content"] },
);

/** Весь контент главной для организации с наложением перевода локали. */
export async function getHomeContent(
  organizationId: string,
  locale: string,
  defaultLocale: string,
): Promise<HomeContent> {
  return getHomeContentCached(organizationId, locale, defaultLocale);
}
