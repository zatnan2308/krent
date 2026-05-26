"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/server";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

export type ActionResult = { ok: true } | { ok: false; error: string };

async function gate() {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false as const, error: "No organization." };
  }
  if (!hasPermission(context, "branding.manage")) {
    return { ok: false as const, error: "You cannot edit the home page." };
  }
  return {
    ok: true as const,
    organizationId: context.organization.id,
    userId: context.user.id,
  };
}

// ---- HERO -------------------------------------------------------

const heroSchema = z.object({
  backgroundImageUrl: z.string().trim().max(500).nullable(),
  eyebrowText: z.string().trim().max(120),
  eyebrowChips: z.array(z.string().trim().min(1).max(60)).max(8),
  headlineTop: z.string().trim().min(1).max(120),
  headlineBottomItalic: z.string().trim().min(1).max(120),
  subtitle: z.string().trim().max(600),
  primaryCtaLabel: z.string().trim().min(1).max(60),
  primaryCtaHref: z.string().trim().min(1).max(500),
  secondaryCtaLabel: z.string().trim().min(1).max(60),
  secondaryCtaHref: z.string().trim().min(1).max(500),
});
export type HeroInput = z.infer<typeof heroSchema>;

export async function saveHero(input: HeroInput): Promise<ActionResult> {
  const parsed = heroSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the hero form." };
  const g = await gate();
  if (!g.ok) return g;
  const admin = createAdminClient();
  const { error } = await admin.from("home_hero").upsert(
    {
      organization_id: g.organizationId,
      background_image_url: parsed.data.backgroundImageUrl,
      eyebrow_text: parsed.data.eyebrowText,
      eyebrow_chips: parsed.data.eyebrowChips,
      headline_top: parsed.data.headlineTop,
      headline_bottom_italic: parsed.data.headlineBottomItalic,
      subtitle: parsed.data.subtitle,
      primary_cta_label: parsed.data.primaryCtaLabel,
      primary_cta_href: parsed.data.primaryCtaHref,
      secondary_cta_label: parsed.data.secondaryCtaLabel,
      secondary_cta_href: parsed.data.secondaryCtaHref,
    },
    { onConflict: "organization_id" },
  );
  if (error) return { ok: false, error: "Could not save hero." };
  revalidatePath("/dashboard/home");
  revalidatePath("/", "layout");
  return { ok: true };
}

// ---- ABOUT ------------------------------------------------------

const aboutSchema = z.object({
  eyebrowText: z.string().trim().max(120),
  headline: z.string().trim().min(1).max(240),
  body: z.string().trim().max(2000),
  portraitUrl: z.string().trim().max(500).nullable(),
  metric1Value: z.string().trim().max(20).nullable(),
  metric1Label: z.string().trim().max(80).nullable(),
  metric2Value: z.string().trim().max(20).nullable(),
  metric2Label: z.string().trim().max(80).nullable(),
  metric3Value: z.string().trim().max(20).nullable(),
  metric3Label: z.string().trim().max(80).nullable(),
  metric4Value: z.string().trim().max(20).nullable(),
  metric4Label: z.string().trim().max(80).nullable(),
});
export type AboutInput = z.infer<typeof aboutSchema>;

export async function saveAbout(input: AboutInput): Promise<ActionResult> {
  const parsed = aboutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the about form." };
  const g = await gate();
  if (!g.ok) return g;
  const admin = createAdminClient();
  const { error } = await admin.from("home_about").upsert(
    {
      organization_id: g.organizationId,
      eyebrow_text: parsed.data.eyebrowText,
      headline: parsed.data.headline,
      body: parsed.data.body,
      portrait_url: parsed.data.portraitUrl,
      metric_1_value: parsed.data.metric1Value,
      metric_1_label: parsed.data.metric1Label,
      metric_2_value: parsed.data.metric2Value,
      metric_2_label: parsed.data.metric2Label,
      metric_3_value: parsed.data.metric3Value,
      metric_3_label: parsed.data.metric3Label,
      metric_4_value: parsed.data.metric4Value,
      metric_4_label: parsed.data.metric4Label,
    },
    { onConflict: "organization_id" },
  );
  if (error) return { ok: false, error: "Could not save about." };
  revalidatePath("/dashboard/home");
  revalidatePath("/", "layout");
  return { ok: true };
}

// ---- CTA --------------------------------------------------------

const ctaSchema = z.object({
  eyebrowText: z.string().trim().max(120),
  headlineLeft: z.string().trim().min(1).max(120),
  headlineItalic: z.string().trim().min(1).max(60),
  headlineRight: z.string().trim().min(1).max(120),
  subtitle: z.string().trim().max(600),
  primaryCtaLabel: z.string().trim().min(1).max(60),
  primaryCtaHref: z.string().trim().min(1).max(500),
  secondaryCtaLabel: z.string().trim().min(1).max(60),
  secondaryCtaHref: z.string().trim().min(1).max(500),
});
export type CtaInput = z.infer<typeof ctaSchema>;

export async function saveCta(input: CtaInput): Promise<ActionResult> {
  const parsed = ctaSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the CTA form." };
  const g = await gate();
  if (!g.ok) return g;
  const admin = createAdminClient();
  const { error } = await admin.from("home_cta").upsert(
    {
      organization_id: g.organizationId,
      eyebrow_text: parsed.data.eyebrowText,
      headline_left: parsed.data.headlineLeft,
      headline_italic: parsed.data.headlineItalic,
      headline_right: parsed.data.headlineRight,
      subtitle: parsed.data.subtitle,
      primary_cta_label: parsed.data.primaryCtaLabel,
      primary_cta_href: parsed.data.primaryCtaHref,
      secondary_cta_label: parsed.data.secondaryCtaLabel,
      secondary_cta_href: parsed.data.secondaryCtaHref,
    },
    { onConflict: "organization_id" },
  );
  if (error) return { ok: false, error: "Could not save CTA." };
  revalidatePath("/dashboard/home");
  revalidatePath("/", "layout");
  return { ok: true };
}

// ---- generic helpers for list items -----------------------------

type ListTable =
  | "home_markets"
  | "home_process_steps"
  | "home_testimonials"
  | "home_trust_badges"
  | "home_press_logos";

export async function deleteHomeItem(
  table: ListTable,
  id: string,
): Promise<ActionResult> {
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Bad id." };
  const g = await gate();
  if (!g.ok) return g;
  const admin = createAdminClient();
  const { error } = await admin
    .from(table)
    .delete()
    .eq("id", id)
    .eq("organization_id", g.organizationId);
  if (error) return { ok: false, error: "Could not delete." };
  revalidatePath("/dashboard/home");
  revalidatePath("/", "layout");
  return { ok: true };
}

// ---- Markets ---------------------------------------------------

const marketSchema = z.object({
  id: z.uuid().nullable(),
  sortOrder: z.number().int().min(0).max(999),
  name: z.string().trim().min(1).max(120),
  region: z.string().trim().max(120).nullable(),
  badge: z.string().trim().max(60).nullable(),
  blurb: z.string().trim().max(600).nullable(),
  imageUrl: z.string().trim().max(500).nullable(),
  href: z.string().trim().max(500).nullable(),
  isFeatured: z.boolean(),
});
export type MarketInput = z.infer<typeof marketSchema>;

export async function saveMarket(input: MarketInput): Promise<ActionResult> {
  const parsed = marketSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the market form." };
  const g = await gate();
  if (!g.ok) return g;
  const admin = createAdminClient();
  const row = {
    organization_id: g.organizationId,
    sort_order: parsed.data.sortOrder,
    name: parsed.data.name,
    region: parsed.data.region,
    badge: parsed.data.badge,
    blurb: parsed.data.blurb,
    image_url: parsed.data.imageUrl,
    href: parsed.data.href,
    is_featured: parsed.data.isFeatured,
  };
  if (parsed.data.id) {
    const { error } = await admin
      .from("home_markets")
      .update(row)
      .eq("id", parsed.data.id)
      .eq("organization_id", g.organizationId);
    if (error) return { ok: false, error: "Could not save market." };
  } else {
    const { error } = await admin.from("home_markets").insert(row);
    if (error) return { ok: false, error: "Could not create market." };
  }
  revalidatePath("/dashboard/home");
  revalidatePath("/", "layout");
  return { ok: true };
}

// ---- Process step ----------------------------------------------

const processSchema = z.object({
  id: z.uuid().nullable(),
  sortOrder: z.number().int().min(0).max(999),
  stepNumber: z.string().trim().min(1).max(10),
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().max(1000).nullable(),
});
export type ProcessInput = z.infer<typeof processSchema>;

export async function saveProcessStep(
  input: ProcessInput,
): Promise<ActionResult> {
  const parsed = processSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the process form." };
  const g = await gate();
  if (!g.ok) return g;
  const admin = createAdminClient();
  const row = {
    organization_id: g.organizationId,
    sort_order: parsed.data.sortOrder,
    step_number: parsed.data.stepNumber,
    title: parsed.data.title,
    body: parsed.data.body,
  };
  if (parsed.data.id) {
    const { error } = await admin
      .from("home_process_steps")
      .update(row)
      .eq("id", parsed.data.id)
      .eq("organization_id", g.organizationId);
    if (error) return { ok: false, error: "Could not save step." };
  } else {
    const { error } = await admin.from("home_process_steps").insert(row);
    if (error) return { ok: false, error: "Could not create step." };
  }
  revalidatePath("/dashboard/home");
  revalidatePath("/", "layout");
  return { ok: true };
}

// ---- Testimonial -----------------------------------------------

const testimonialSchema = z.object({
  id: z.uuid().nullable(),
  sortOrder: z.number().int().min(0).max(999),
  quote: z.string().trim().min(1).max(2000),
  authorName: z.string().trim().max(200).nullable(),
  dealLabel: z.string().trim().max(200).nullable(),
});
export type TestimonialInput = z.infer<typeof testimonialSchema>;

export async function saveTestimonial(
  input: TestimonialInput,
): Promise<ActionResult> {
  const parsed = testimonialSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the testimonial form." };
  const g = await gate();
  if (!g.ok) return g;
  const admin = createAdminClient();
  const row = {
    organization_id: g.organizationId,
    sort_order: parsed.data.sortOrder,
    quote: parsed.data.quote,
    author_name: parsed.data.authorName,
    deal_label: parsed.data.dealLabel,
  };
  if (parsed.data.id) {
    const { error } = await admin
      .from("home_testimonials")
      .update(row)
      .eq("id", parsed.data.id)
      .eq("organization_id", g.organizationId);
    if (error) return { ok: false, error: "Could not save testimonial." };
  } else {
    const { error } = await admin.from("home_testimonials").insert(row);
    if (error) return { ok: false, error: "Could not create testimonial." };
  }
  revalidatePath("/dashboard/home");
  revalidatePath("/", "layout");
  return { ok: true };
}

// ---- Trust badge ------------------------------------------------

const trustSchema = z.object({
  id: z.uuid().nullable(),
  sortOrder: z.number().int().min(0).max(999),
  label: z.string().trim().min(1).max(60),
  sub: z.string().trim().max(120).nullable(),
});
export type TrustInput = z.infer<typeof trustSchema>;

export async function saveTrustBadge(input: TrustInput): Promise<ActionResult> {
  const parsed = trustSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the badge form." };
  const g = await gate();
  if (!g.ok) return g;
  const admin = createAdminClient();
  const row = {
    organization_id: g.organizationId,
    sort_order: parsed.data.sortOrder,
    label: parsed.data.label,
    sub: parsed.data.sub,
  };
  if (parsed.data.id) {
    const { error } = await admin
      .from("home_trust_badges")
      .update(row)
      .eq("id", parsed.data.id)
      .eq("organization_id", g.organizationId);
    if (error) return { ok: false, error: "Could not save badge." };
  } else {
    const { error } = await admin.from("home_trust_badges").insert(row);
    if (error) return { ok: false, error: "Could not create badge." };
  }
  revalidatePath("/dashboard/home");
  revalidatePath("/", "layout");
  return { ok: true };
}

// ---- Press logo -------------------------------------------------

const pressSchema = z.object({
  id: z.uuid().nullable(),
  sortOrder: z.number().int().min(0).max(999),
  name: z.string().trim().min(1).max(80),
  logoUrl: z.string().trim().max(500).nullable(),
});
export type PressInput = z.infer<typeof pressSchema>;

export async function savePressLogo(input: PressInput): Promise<ActionResult> {
  const parsed = pressSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the press form." };
  const g = await gate();
  if (!g.ok) return g;
  const admin = createAdminClient();
  const row = {
    organization_id: g.organizationId,
    sort_order: parsed.data.sortOrder,
    name: parsed.data.name,
    logo_url: parsed.data.logoUrl,
  };
  if (parsed.data.id) {
    const { error } = await admin
      .from("home_press_logos")
      .update(row)
      .eq("id", parsed.data.id)
      .eq("organization_id", g.organizationId);
    if (error) return { ok: false, error: "Could not save press logo." };
  } else {
    const { error } = await admin.from("home_press_logos").insert(row);
    if (error) return { ok: false, error: "Could not create press logo." };
  }
  revalidatePath("/dashboard/home");
  revalidatePath("/", "layout");
  return { ok: true };
}
