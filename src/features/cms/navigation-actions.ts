"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

const HEADER_MENU_KEY = "header";

type ActionResult = { ok: true } | { ok: false; error: string };

/** Возвращает id меню header организации, создавая его при отсутствии. */
async function ensureHeaderMenu(
  organizationId: string,
): Promise<string | null> {
  const supabase = createClient();

  const { data: existing } = await supabase
    .from("navigation_menus")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("key", HEADER_MENU_KEY)
    .maybeSingle();
  if (existing) {
    return existing.id;
  }

  const { data: created } = await supabase
    .from("navigation_menus")
    .insert({
      organization_id: organizationId,
      key: HEADER_MENU_KEY,
      name: "Header",
    })
    .select("id")
    .single();

  return created?.id ?? null;
}

/** Добавляет пункт в меню header организации. */
export async function addMenuItem(
  label: string,
  url: string,
): Promise<ActionResult> {
  const context = await requireOrganizationContext();
  if (
    !context.organization ||
    !hasPermission(context, "navigation.manage")
  ) {
    return { ok: false, error: "You cannot manage navigation." };
  }
  if (!label.trim() || !url.trim()) {
    return { ok: false, error: "Label and URL are required." };
  }

  const menuId = await ensureHeaderMenu(context.organization.id);
  if (!menuId) {
    return { ok: false, error: "Could not resolve the menu." };
  }

  const supabase = createClient();
  const { count } = await supabase
    .from("navigation_items")
    .select("*", { count: "exact", head: true })
    .eq("menu_id", menuId);

  const { error } = await supabase.from("navigation_items").insert({
    menu_id: menuId,
    organization_id: context.organization.id,
    label: label.trim(),
    url: url.trim(),
    position: count ?? 0,
  });
  if (error) {
    return { ok: false, error: "Could not add the menu item." };
  }

  revalidatePath("/dashboard/navigation");
  return { ok: true };
}

/** Удаляет пункт меню организации. */
export async function deleteMenuItem(itemId: string): Promise<void> {
  const context = await requireOrganizationContext();
  if (
    !context.organization ||
    !hasPermission(context, "navigation.manage")
  ) {
    throw new Error("You cannot manage navigation.");
  }

  const supabase = createClient();
  await supabase
    .from("navigation_items")
    .delete()
    .eq("id", itemId)
    .eq("organization_id", context.organization.id);

  revalidatePath("/dashboard/navigation");
}
