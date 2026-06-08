import { unstable_cache } from "next/cache";

import {
  getContentTranslations,
  tr,
} from "@/lib/i18n/content-translations";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

/** Пункты навигационного меню организации по ключу меню (для админки, под RLS). */
export async function getNavigationItems(
  organizationId: string,
  menuKey: string,
): Promise<Tables<"navigation_items">[]> {
  const supabase = createClient();

  const { data: menu } = await supabase
    .from("navigation_menus")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("key", menuKey)
    .maybeSingle();

  if (!menu) {
    return [];
  }

  const { data: items } = await supabase
    .from("navigation_items")
    .select("*")
    .eq("menu_id", menu.id)
    .order("position", { ascending: true });

  return items ?? [];
}

export interface PublicNavItem {
  label: string;
  url: string;
}

/** Меню для публичного сайта (admin, мимо RLS), закэшировано per-org/menu. */
const getPublicNavigationCached = unstable_cache(
  async (
    organizationId: string,
    menuKey: string,
    locale: string,
    defaultLocale: string,
  ): Promise<PublicNavItem[]> => {
    const admin = createAdminClient();
    const { data: menu } = await admin
      .from("navigation_menus")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("key", menuKey)
      .maybeSingle();
    if (!menu) return [];
    const { data: items } = await admin
      .from("navigation_items")
      .select("id, label, url, position")
      .eq("menu_id", menu.id)
      .order("position", { ascending: true });
    const translations = await getContentTranslations(
      organizationId,
      "nav_item",
      locale,
      defaultLocale,
    );
    return (items ?? [])
      .filter((item) => Boolean(item.url))
      .map((item) => ({
        label: tr(item.label, translations.get(item.id)?.label) ?? item.label,
        url: item.url as string,
      }));
  },
  ["public-navigation"],
  { revalidate: 60, tags: ["public-site"] },
);

/** Пункты публичного меню организации по ключу (header/footer). */
export async function getPublicNavigation(
  organizationId: string,
  menuKey: string,
  locale: string,
  defaultLocale: string,
): Promise<PublicNavItem[]> {
  return getPublicNavigationCached(organizationId, menuKey, locale, defaultLocale);
}

/** Пункт меню с вложенными детьми (для дропдаунов хедера). */
export interface PublicNavTreeItem {
  label: string;
  /** null — чистый родитель-дропдаун без собственной ссылки. */
  url: string | null;
  children: { label: string; url: string }[];
}

/**
 * Дерево меню (1 уровень вложенности) для публичного хедера: верхнеуровневые
 * пункты с детьми. URL берётся из `url`, иначе резолвится из `page_id`
 * (только для published-страниц). Admin-клиент, кэш per-org/menu.
 */
const getPublicNavigationTreeCached = unstable_cache(
  async (
    organizationId: string,
    menuKey: string,
    locale: string,
    defaultLocale: string,
  ): Promise<PublicNavTreeItem[]> => {
    const admin = createAdminClient();
    const { data: menu } = await admin
      .from("navigation_menus")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("key", menuKey)
      .maybeSingle();
    if (!menu) return [];
    const translations = await getContentTranslations(
      organizationId,
      "nav_item",
      locale,
      defaultLocale,
    );
    const trLabel = (id: string, base: string): string =>
      tr(base, translations.get(id)?.label) ?? base;

    const { data: items } = await admin
      .from("navigation_items")
      .select("id, parent_id, page_id, label, url, position")
      .eq("menu_id", menu.id)
      .order("position", { ascending: true });
    const rows = items ?? [];

    // Резолв page_id → slug (только published-страницы).
    const pageIds = [
      ...new Set(
        rows
          .map((row) => row.page_id)
          .filter((value): value is string => Boolean(value)),
      ),
    ];
    const slugByPageId = new Map<string, string>();
    if (pageIds.length > 0) {
      const { data: pages } = await admin
        .from("pages")
        .select("id, slug, status")
        .in("id", pageIds);
      for (const page of pages ?? []) {
        if (page.status === "published") {
          slugByPageId.set(page.id, page.slug);
        }
      }
    }

    const resolveUrl = (row: (typeof rows)[number]): string | null => {
      if (row.url) return row.url;
      if (row.page_id && slugByPageId.has(row.page_id)) {
        return `/${slugByPageId.get(row.page_id)}`;
      }
      return null;
    };

    return rows
      .filter((row) => !row.parent_id)
      .map((parent) => ({
        label: trLabel(parent.id, parent.label),
        url: resolveUrl(parent),
        children: rows
          .filter((row) => row.parent_id === parent.id)
          .map((child) => ({
            label: trLabel(child.id, child.label),
            url: resolveUrl(child),
          }))
          .filter((child): child is { label: string; url: string } =>
            Boolean(child.url),
          ),
      }))
      // Оставляем пункт, если у него есть ссылка или хотя бы один ребёнок.
      .filter((item) => item.url !== null || item.children.length > 0);
  },
  ["public-navigation-tree"],
  { revalidate: 60, tags: ["public-site"] },
);

/** Дерево публичного меню организации (header) с одним уровнем вложенности. */
export async function getPublicNavigationTree(
  organizationId: string,
  menuKey: string,
  locale: string,
  defaultLocale: string,
): Promise<PublicNavTreeItem[]> {
  return getPublicNavigationTreeCached(
    organizationId,
    menuKey,
    locale,
    defaultLocale,
  );
}
