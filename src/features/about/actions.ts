"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";

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
): Promise<ActionResult> {
  const parsed = aboutPageSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the form." };
  }
  const context = await guardAbout();
  if (!context?.organization) {
    return { ok: false, error: "You cannot edit this page." };
  }
  const admin = createAdminClient();
  const { error } = await admin.from("about_page").upsert(
    {
      organization_id: context.organization.id,
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
  revalidatePath("/dashboard/about");
  revalidateTag("about-content");
}
