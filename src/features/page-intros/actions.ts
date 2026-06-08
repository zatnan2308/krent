"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";

import {
  resolveOrgLocale,
  saveContentTranslation,
} from "@/lib/i18n/content-translations";
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
  locale?: string,
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
  const org = context.organization;
  const target = resolveOrgLocale(org, locale);

  if (target === org.default_language) {
    const admin = createAdminClient();
    const { error } = await admin.from("page_intros").upsert(
      {
        organization_id: org.id,
        page_key: parsed.data.pageKey,
        eyebrow: parsed.data.eyebrow,
        heading: parsed.data.heading,
        subheading: parsed.data.subheading,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id,page_key" },
    );
    if (error) return { ok: false, error: "Could not save the page intro." };
  } else {
    const ok = await saveContentTranslation(
      org.id,
      "page_intro",
      parsed.data.pageKey,
      target,
      {
        eyebrow: parsed.data.eyebrow,
        heading: parsed.data.heading,
        subheading: parsed.data.subheading,
      },
    );
    if (!ok) return { ok: false, error: "Could not save the page intro." };
  }
  revalidatePath("/dashboard/about");
  revalidateTag("page-intros");
  return { ok: true };
}
