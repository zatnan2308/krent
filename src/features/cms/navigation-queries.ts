import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

/** Пункты навигационного меню организации по ключу меню. */
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
