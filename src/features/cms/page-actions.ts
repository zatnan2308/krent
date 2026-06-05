"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";
import type { Json } from "@/types/database";

import { savePageSchema, type SavePageInput, type SavePageResult } from "./schema";

/** Создаёт или обновляет страницу и её перевод на язык по умолчанию. */
export async function savePage(
  input: SavePageInput,
): Promise<SavePageResult> {
  const parsed = savePageSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid page data." };
  }

  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false, error: "No active organization." };
  }
  if (!hasPermission(context, "pages.manage")) {
    return { ok: false, error: "You do not have permission to manage pages." };
  }

  const data = parsed.data;
  const supabase = createClient();
  const organizationId = context.organization.id;
  // Локаль перевода: переданная (если включена у организации), иначе дефолтная.
  const defaultLocale = context.organization.default_language;
  const enabledLanguages = context.organization.enabled_languages ?? [];
  const locale =
    data.locale &&
    (data.locale === defaultLocale || enabledLanguages.includes(data.locale))
      ? data.locale
      : defaultLocale;
  const publishedAt =
    data.status === "published" ? new Date().toISOString() : null;
  const content = data.content as unknown as Json;

  let pageId = data.id;

  if (pageId) {
    const { error } = await supabase
      .from("pages")
      .update({
        slug: data.slug,
        type: data.type,
        status: data.status,
        published_at: publishedAt,
      })
      .eq("id", pageId)
      .eq("organization_id", organizationId);
    if (error) {
      return { ok: false, error: "Could not save the page." };
    }
  } else {
    const { data: created, error } = await supabase
      .from("pages")
      .insert({
        organization_id: organizationId,
        slug: data.slug,
        type: data.type,
        status: data.status,
        published_at: publishedAt,
      })
      .select("id")
      .single();
    if (error || !created) {
      return { ok: false, error: "Could not create the page." };
    }
    pageId = created.id;
  }

  const { error: translationError } = await supabase
    .from("page_translations")
    .upsert({
      page_id: pageId,
      organization_id: organizationId,
      locale,
      title: data.title,
      content,
      seo_title: data.seoTitle ?? null,
      seo_description: data.seoDescription ?? null,
    });
  if (translationError) {
    return { ok: false, error: "Could not save page content." };
  }

  revalidatePath("/dashboard/pages");
  return { ok: true, id: pageId };
}

/** Удаляет страницу организации. */
export async function deletePage(pageId: string): Promise<void> {
  const context = await requireOrganizationContext();
  if (
    !context.organization ||
    !hasPermission(context, "pages.manage")
  ) {
    throw new Error("You do not have permission to manage pages.");
  }

  const supabase = createClient();
  await supabase
    .from("pages")
    .delete()
    .eq("id", pageId)
    .eq("organization_id", context.organization.id);

  revalidatePath("/dashboard/pages");
}
