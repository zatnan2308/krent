import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

import { parsePageContent, type PageContent } from "./content";

/** Строка списка страниц в dashboard. */
export interface PageListItem {
  id: string;
  slug: string;
  type: Tables<"pages">["type"];
  status: Tables<"pages">["status"];
  title: string;
  updatedAt: string;
}

/** Контент одной локали страницы. */
export interface PageLocaleContent {
  title: string;
  seoTitle: string;
  seoDescription: string;
  content: PageContent;
}

/** Данные страницы для формы редактирования. */
export interface PageEditData {
  id: string;
  slug: string;
  type: Tables<"pages">["type"];
  status: Tables<"pages">["status"];
  /** Контент локали по умолчанию (обратная совместимость / стартовый показ). */
  title: string;
  seoTitle: string;
  seoDescription: string;
  content: PageContent;
  /** Все переводы страницы по локали — для мультиязычного редактора. */
  translations: Record<string, PageLocaleContent>;
}

/** Список страниц организации с заголовком из перевода. */
export async function listPages(
  organizationId: string,
  defaultLocale: string,
): Promise<PageListItem[]> {
  const supabase = createClient();
  const [pagesResult, translationsResult] = await Promise.all([
    supabase
      .from("pages")
      .select("*")
      .eq("organization_id", organizationId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("page_translations")
      .select("page_id, locale, title")
      .eq("organization_id", organizationId),
  ]);

  const pages = pagesResult.data ?? [];
  const translations = translationsResult.data ?? [];

  return pages.map((page) => {
    const translation =
      translations.find(
        (t) => t.page_id === page.id && t.locale === defaultLocale,
      ) ?? translations.find((t) => t.page_id === page.id);

    return {
      id: page.id,
      slug: page.slug,
      type: page.type,
      status: page.status,
      title: translation?.title ?? page.slug,
      updatedAt: page.updated_at,
    };
  });
}

/** Данные одной страницы организации для редактирования. */
export async function getPageForEdit(
  organizationId: string,
  pageId: string,
  locale: string,
): Promise<PageEditData | null> {
  const supabase = createClient();
  const { data: page } = await supabase
    .from("pages")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", pageId)
    .maybeSingle();

  if (!page) {
    return null;
  }

  const { data: translationRows } = await supabase
    .from("page_translations")
    .select("*")
    .eq("page_id", pageId);

  const translations: Record<string, PageLocaleContent> = {};
  for (const row of translationRows ?? []) {
    translations[row.locale] = {
      title: row.title ?? "",
      seoTitle: row.seo_title ?? "",
      seoDescription: row.seo_description ?? "",
      content: parsePageContent(row.content),
    };
  }
  const def = translations[locale];

  return {
    id: page.id,
    slug: page.slug,
    type: page.type,
    status: page.status,
    title: def?.title ?? "",
    seoTitle: def?.seoTitle ?? "",
    seoDescription: def?.seoDescription ?? "",
    content: def?.content ?? parsePageContent(undefined),
    translations,
  };
}
