import { unstable_cache } from "next/cache";

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
  async (organizationId: string, menuKey: string): Promise<PublicNavItem[]> => {
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
      .select("label, url, position")
      .eq("menu_id", menu.id)
      .order("position", { ascending: true });
    return (items ?? [])
      .filter((item) => Boolean(item.url))
      .map((item) => ({ label: item.label, url: item.url as string }));
  },
  ["public-navigation"],
  { revalidate: 60, tags: ["public-site"] },
);

/** Пункты публичного меню организации по ключу (header/footer). */
export async function getPublicNavigation(
  organizationId: string,
  menuKey: string,
): Promise<PublicNavItem[]> {
  return getPublicNavigationCached(organizationId, menuKey);
}
