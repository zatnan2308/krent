"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";

import {
  deleteContentTranslations,
  resolveOrgLocale,
  saveContentTranslation,
} from "@/lib/i18n/content-translations";
import { createAdminClient } from "@/lib/supabase/server";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

type ActionResult = { ok: true } | { ok: false; error: string };

async function guardAbout() {
  const context = await requireOrganizationContext();
  if (!context.organization) return null;
  if (!hasPermission(context, "branding.manage")) return null;
  return context;
}

const aboutPageSchema = z.object({
  heroTitle: z.string().trim().max(300).nullable(),
  storyHeading: z.string().trim().max(300).nullable(),
  storyBody: z.string().trim().max(8000).nullable(),
  quote1: z.string().trim().max(600).nullable(),
  quote2: z.string().trim().max(600).nullable(),
});
export type AboutPageInput = z.infer<typeof aboutPageSchema>;

export async function updateAboutPage(
  input: AboutPageInput,
  locale?: string,
): Promise<ActionResult> {
  const parsed = aboutPageSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the form." };
  }
  const context = await guardAbout();
  if (!context?.organization) {
    return { ok: false, error: "You cannot edit this page." };
  }
  const org = context.organization;
  const target = resolveOrgLocale(org, locale);

  if (target === org.default_language) {
    const admin = createAdminClient();
    const { error } = await admin.from("about_page").upsert(
      {
        organization_id: org.id,
        hero_title: parsed.data.heroTitle,
        story_heading: parsed.data.storyHeading,
        story_body: parsed.data.storyBody,
        quote_1: parsed.data.quote1,
        quote_2: parsed.data.quote2,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id" },
    );
    if (error) return { ok: false, error: "Could not save the page." };
  } else {
    const ok = await saveContentTranslation(org.id, "about_page", "", target, {
      hero_title: parsed.data.heroTitle,
      story_heading: parsed.data.storyHeading,
      story_body: parsed.data.storyBody,
      quote_1: parsed.data.quote1,
      quote_2: parsed.data.quote2,
    });
    if (!ok) return { ok: false, error: "Could not save the page." };
  }
  revalidatePath("/dashboard/about");
  revalidateTag("about-content");
  return { ok: true };
}

const milestoneSchema = z.object({
  year: z.string().trim().min(1).max(20),
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().max(1000),
});
export type MilestoneInput = z.infer<typeof milestoneSchema>;

export async function addMilestone(
  input: MilestoneInput,
): Promise<ActionResult> {
  const parsed = milestoneSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Year and title are required." };
  }
  const context = await guardAbout();
  if (!context?.organization) {
    return { ok: false, error: "You cannot edit this page." };
  }
  const admin = createAdminClient();
  const { count } = await admin
    .from("about_milestones")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", context.organization.id);
  const { error } = await admin.from("about_milestones").insert({
    organization_id: context.organization.id,
    year: parsed.data.year,
    title: parsed.data.title,
    body: parsed.data.body,
    sort_order: count ?? 0,
  });
  if (error) return { ok: false, error: "Could not add the milestone." };
  revalidatePath("/dashboard/about");
  revalidateTag("about-content");
  return { ok: true };
}

export async function deleteMilestone(id: string): Promise<void> {
  const context = await guardAbout();
  if (!context?.organization) {
    throw new Error("You cannot edit this page.");
  }
  const admin = createAdminClient();
  await admin
    .from("about_milestones")
    .delete()
    .eq("id", id)
    .eq("organization_id", context.organization.id);
  // Чистим переводы удалённой вехи во всех локалях.
  await deleteContentTranslations(
    context.organization.id,
    "about_milestone",
    id,
  );
  revalidatePath("/dashboard/about");
  revalidateTag("about-content");
}

export async function updateMilestone(
  id: string,
  input: MilestoneInput,
  locale?: string,
): Promise<ActionResult> {
  const context = await guardAbout();
  if (!context?.organization) {
    return { ok: false, error: "You cannot edit this page." };
  }
  const org = context.organization;
  const target = resolveOrgLocale(org, locale);

  if (target === org.default_language) {
    const parsed = milestoneSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: "Year and title are required." };
    }
    const admin = createAdminClient();
    const { error } = await admin
      .from("about_milestones")
      .update({
        year: parsed.data.year,
        title: parsed.data.title,
        body: parsed.data.body,
      })
      .eq("id", id)
      .eq("organization_id", org.id);
    if (error) return { ok: false, error: "Could not update the milestone." };
  } else {
    // Перевод вехи: поля необязательны (пустое → fallback на базу).
    const ok = await saveContentTranslation(
      org.id,
      "about_milestone",
      id,
      target,
      {
        year: input.year.trim() || null,
        title: input.title.trim() || null,
        body: input.body.trim() || null,
      },
    );
    if (!ok) return { ok: false, error: "Could not update the milestone." };
  }
  revalidatePath("/dashboard/about");
  revalidateTag("about-content");
  return { ok: true };
}

export async function moveMilestone(
  id: string,
  direction: "up" | "down",
): Promise<ActionResult> {
  const context = await guardAbout();
  if (!context?.organization) {
    return { ok: false, error: "You cannot edit this page." };
  }
  const admin = createAdminClient();
  const { data: list } = await admin
    .from("about_milestones")
    .select("id, sort_order")
    .eq("organization_id", context.organization.id)
    .order("sort_order", { ascending: true });
  const items = list ?? [];
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) return { ok: false, error: "Milestone not found." };
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= items.length) return { ok: true };
  const a = items[index];
  const b = items[swapIndex];
  if (!a || !b) return { ok: true };
  await admin
    .from("about_milestones")
    .update({ sort_order: b.sort_order })
    .eq("id", a.id);
  await admin
    .from("about_milestones")
    .update({ sort_order: a.sort_order })
    .eq("id", b.id);
  revalidatePath("/dashboard/about");
  revalidateTag("about-content");
  return { ok: true };
}
