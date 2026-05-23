import { redirect } from "next/navigation";

import { ROUTES } from "@/lib/constants/routes";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/server/auth";
import {
  getOrganizationContext,
  type OrganizationContext,
} from "@/server/organization-context";

/**
 * Синхронная проверка права по уже загруженному контексту.
 * Super Admin проходит любую проверку.
 */
export function hasPermission(
  context: OrganizationContext,
  permission: string,
): boolean {
  if (context.isSuperAdmin) {
    return true;
  }
  return context.permissions.includes(permission);
}

/** Есть ли у текущего пользователя право в активной организации. */
export async function can(permission: string): Promise<boolean> {
  const context = await getOrganizationContext();
  if (!context || !context.organization) {
    return false;
  }
  return hasPermission(context, permission);
}

/**
 * Бросает ошибку, если у пользователя нет права.
 * Для использования в server actions и route handlers.
 */
export async function requirePermission(permission: string): Promise<void> {
  const allowed = await can(permission);
  if (!allowed) {
    throw new Error(`Forbidden: missing permission "${permission}".`);
  }
}

/** Текущий пользователь — платформенный Super Admin. */
export async function getIsSuperAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) {
    return false;
  }
  const supabase = createClient();
  const { data } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  return data !== null;
}

/** Текущий пользователь — Super Admin; иначе редирект в dashboard. */
export async function requireSuperAdmin(): Promise<void> {
  const allowed = await getIsSuperAdmin();
  if (!allowed) {
    redirect(ROUTES.dashboard.root);
  }
}
