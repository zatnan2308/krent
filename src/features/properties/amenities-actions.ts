"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

import type { ActionResult } from "./schema";

const AMENITIES_PATH = "/dashboard/properties/amenities";

/**
 * Строит технический ключ удобства из названия. Случайный суффикс
 * исключает конфликт с уникальным индексом (organization_id, key).
 */
function buildKey(name: string): string {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 32) || "item";
  return `${base}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Создаёт кастомную категорию удобств организации. */
export async function createAmenityCategory(
  name: string,
): Promise<ActionResult> {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false, error: "No active organization." };
  }
  if (!hasPermission(context, "properties.manage_all")) {
    return { ok: false, error: "You cannot manage amenities." };
  }
  const trimmed = name.trim();
  if (!trimmed) {
    return { ok: false, error: "Category name is required." };
  }

  const supabase = createClient();
  const { count } = await supabase
    .from("amenity_categories")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", context.organization.id);

  const { error } = await supabase.from("amenity_categories").insert({
    organization_id: context.organization.id,
    key: buildKey(trimmed),
    name: trimmed,
    sort_order: 100 + (count ?? 0),
  });
  if (error) {
    return { ok: false, error: "Could not create the category." };
  }

  revalidatePath(AMENITIES_PATH);
  return { ok: true };
}

/** Создаёт кастомное удобство организации в выбранной категории. */
export async function createAmenity(
  categoryId: string,
  name: string,
): Promise<ActionResult> {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false, error: "No active organization." };
  }
  if (!hasPermission(context, "properties.manage_all")) {
    return { ok: false, error: "You cannot manage amenities." };
  }
  const trimmed = name.trim();
  if (!trimmed) {
    return { ok: false, error: "Amenity name is required." };
  }
  if (!categoryId) {
    return { ok: false, error: "Choose a category for the amenity." };
  }

  const supabase = createClient();
  const { count } = await supabase
    .from("amenities")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", context.organization.id);

  const { error } = await supabase.from("amenities").insert({
    organization_id: context.organization.id,
    category_id: categoryId,
    key: buildKey(trimmed),
    name: trimmed,
    sort_order: 100 + (count ?? 0),
  });
  if (error) {
    return { ok: false, error: "Could not create the amenity." };
  }

  revalidatePath(AMENITIES_PATH);
  return { ok: true };
}

/** Удаляет кастомное удобство организации (системные не затрагиваются). */
export async function deleteAmenity(amenityId: string): Promise<ActionResult> {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false, error: "No active organization." };
  }
  if (!hasPermission(context, "properties.manage_all")) {
    return { ok: false, error: "You cannot manage amenities." };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("amenities")
    .delete()
    .eq("id", amenityId)
    .eq("organization_id", context.organization.id);
  if (error) {
    return { ok: false, error: "Could not delete the amenity." };
  }

  revalidatePath(AMENITIES_PATH);
  return { ok: true };
}

/** Удаляет кастомную категорию организации (системные не затрагиваются). */
export async function deleteAmenityCategory(
  categoryId: string,
): Promise<ActionResult> {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false, error: "No active organization." };
  }
  if (!hasPermission(context, "properties.manage_all")) {
    return { ok: false, error: "You cannot manage amenities." };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("amenity_categories")
    .delete()
    .eq("id", categoryId)
    .eq("organization_id", context.organization.id);
  if (error) {
    return { ok: false, error: "Could not delete the category." };
  }

  revalidatePath(AMENITIES_PATH);
  return { ok: true };
}
