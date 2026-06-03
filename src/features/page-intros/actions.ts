"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/server";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

type ActionResult = { ok: true } | { ok: false; error: string };

const introSchema = z.object({
  pageKey: z.string().trim().min(1).max(40),
  eyebrow: z.string().trim().max(120).nullable(),
  heading: z.string().trim().max(300).nullable(),
  subheading: z.string().trim().max(600).nullable(),
});
export type PageIntroInput = z.infer<typeof introSchema>;

export async function updatePageIntro(
  input: PageIntroInput,
): Promise<ActionResult> {
  const parsed = introSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the form." };
  }
  const context = await requireOrganizationContext();
  if (!context.organization) return { ok: false, error: "No organization." };
  if (!hasPermission(context, "branding.manage")) {
    return { ok: false, error: "You cannot edit pages." };
  }
  const admin = createAdminClient();
  const { error } = await admin.from("page_intros").upsert(
    {
      organization_id: context.organization.id,
      page_key: parsed.data.pageKey,
      eyebrow: parsed.data.eyebrow,
      heading: parsed.data.heading,
      subheading: parsed.data.subheading,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id,page_key" },
  );
  if (error) return { ok: false, error: "Could not save the page intro." };
  revalidatePath("/dashboard/about");
  revalidateTag("page-intros");
  return { ok: true };
}
