"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/server";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

export interface SeoSettingsResult {
  ok: boolean;
  error?: string;
}

const seoSettingsSchema = z.object({
  defaultTitle: z.string().trim().max(200),
  titleSuffix: z.string().trim().max(120),
  defaultDescription: z.string().trim().max(500),
  defaultOgImageUrl: z.string().trim().max(500),
  robotsTxt: z.string().trim().max(5000),
  googleSiteVerification: z.string().trim().max(200),
});
export type SeoSettingsInput = z.infer<typeof seoSettingsSchema>;

/** Сохраняет глобальные SEO-настройки сайта (по организации). */
export async function updateSeoSettings(
  input: SeoSettingsInput,
): Promise<SeoSettingsResult> {
  const parsed = seoSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the SEO fields." };
  }
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false, error: "No organization." };
  }
  if (!hasPermission(context, "seo.manage")) {
    return { ok: false, error: "You cannot change SEO settings." };
  }

  const admin = createAdminClient();
  const d = parsed.data;
  const { error } = await admin.from("seo_settings").upsert(
    {
      organization_id: context.organization.id,
      default_title: d.defaultTitle || null,
      title_suffix: d.titleSuffix || null,
      default_description: d.defaultDescription || null,
      default_og_image_url: d.defaultOgImageUrl || null,
      robots_txt: d.robotsTxt || null,
      google_site_verification: d.googleSiteVerification || null,
    },
    { onConflict: "organization_id" },
  );
  if (error) {
    return { ok: false, error: "Could not save SEO settings." };
  }

  revalidatePath("/dashboard/seo");
  revalidateTag("public-site");
  return { ok: true };
}
