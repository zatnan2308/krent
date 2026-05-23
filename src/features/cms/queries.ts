import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

import { parsePageContent, type PageContent } from "./content";

/** Опубликованная страница вместе с переводом и разобранным контентом. */
export interface ResolvedPage {
  page: Tables<"pages">;
  translation: Tables<"page_translations">;
  content: PageContent;
}

/** Меню с упорядоченными пунктами. */
export interface MenuWithItems {
  menu: Tables<"navigation_menus">;
  items: Tables<"navigation_items">[];
}

/** Перевод страницы для локали; fallback — перевод на язык по умолчанию. */
async function getTranslation(
  pageId: string,
  locale: string,
  defaultLocale: string,
): Promise<Tables<"page_translations"> | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("page_translations")
    .select("*")
    .eq("page_id", pageId)
    .in("locale", [locale, defaultLocale]);

  const translations = data ?? [];
  return (
    translations.find((t) => t.locale === locale) ??
    translations.find((t) => t.locale === defaultLocale) ??
    null
  );
}

/** Опубликованная страница организации по слагу. */
export async function getPublishedPage(
  organizationId: string,
  slug: string,
  locale: string,
  defaultLocale: string,
): Promise<ResolvedPage | null> {
  const supabase = createClient();
  const { data: page } = await supabase
    .from("pages")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (!page) {
    return null;
  }

  const translation = await getTranslation(page.id, locale, defaultLocale);
  if (!translation) {
    return null;
  }

  return { page, translation, content: parsePageContent(translation.content) };
}

/** Опубликованная домашняя страница организации (type = home). */
export async function getHomePage(
  organizationId: string,
  locale: string,
  defaultLocale: string,
): Promise<ResolvedPage | null> {
  const supabase = createClient();
  const { data: page } = await supabase
    .from("pages")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("type", "home")
    .eq("status", "published")
    .maybeSingle();

  if (!page) {
    return null;
  }

  const translation = await getTranslation(page.id, locale, defaultLocale);
  if (!translation) {
    return null;
  }

  return { page, translation, content: parsePageContent(translation.content) };
}

/** Навигационное меню организации по ключу с упорядоченными пунктами. */
export async function getMenu(
  organizationId: string,
  key: string,
): Promise<MenuWithItems | null> {
  const supabase = createClient();
  const { data: menu } = await supabase
    .from("navigation_menus")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("key", key)
    .maybeSingle();

  if (!menu) {
    return null;
  }

  const { data: items } = await supabase
    .from("navigation_items")
    .select("*")
    .eq("menu_id", menu.id)
    .order("position", { ascending: true });

  return { menu, items: items ?? [] };
}

/** Редирект организации по исходному пути. */
export async function getRedirect(
  organizationId: string,
  sourcePath: string,
): Promise<Tables<"redirects"> | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("redirects")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("source_path", sourcePath)
    .maybeSingle();

  return data;
}
