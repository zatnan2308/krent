import { cache } from "react";

import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ROUTES } from "@/lib/constants/routes";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/server/auth";
import type { Tables } from "@/types/database";

/** Имя cookie с id активной организации. */
export const ACTIVE_ORG_COOKIE = "krent_active_org";

export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
}

export interface OrganizationRole {
  id: string;
  key: string;
  name: string;
}

/**
 * Контекст организации для текущего запроса.
 * `organization` равен null, если у пользователя ещё нет ни одной организации.
 */
export interface OrganizationContext {
  user: User;
  organizations: OrganizationSummary[];
  organization: Tables<"organizations"> | null;
  role: OrganizationRole | null;
  permissions: string[];
  modules: string[];
  isSuperAdmin: boolean;
}

/**
 * Собирает контекст организации: список организаций пользователя, активную
 * организацию (из cookie, с проверкой членства), роль, права и модули.
 * Возвращает null, если пользователь не аутентифицирован.
 *
 * Обёрнут в React cache() — за один запрос (layout + page) выполняется один
 * раз, а не дублируется. Независимые запросы идут параллельно (Promise.all),
 * чтобы не платить латентностью за каждый round-trip последовательно.
 */
export const getOrganizationContext = cache(
  async function getOrganizationContextImpl(): Promise<OrganizationContext | null> {
    const user = await getCurrentUser();
    if (!user) {
      return null;
    }

    const supabase = createClient();

    // Членства + статус супер-админа — параллельно.
    const [membershipsRes, adminRes] = await Promise.all([
      supabase
        .from("organization_members")
        .select("organization_id, role_id")
        .eq("user_id", user.id)
        .eq("status", "active"),
      supabase
        .from("platform_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);
    const membershipList = membershipsRes.data ?? [];
    const isSuperAdmin = adminRes.data !== null;

    const emptyContext: OrganizationContext = {
      user,
      organizations: [],
      organization: null,
      role: null,
      permissions: [],
      modules: [],
      isSuperAdmin,
    };

    if (membershipList.length === 0) {
      return emptyContext;
    }

    // Организации пользователя.
    const organizationIds = membershipList.map((m) => m.organization_id);
    const { data: orgRows } = await supabase
      .from("organizations")
      .select("id, name, slug")
      .in("id", organizationIds)
      .order("name");
    const organizations: OrganizationSummary[] = orgRows ?? [];

    const fallbackOrganization = organizations[0];
    if (!fallbackOrganization) {
      return emptyContext;
    }

    // Активная организация: из cookie (если пользователь в ней член), иначе первая.
    const cookieOrgId = cookies().get(ACTIVE_ORG_COOKIE)?.value;
    const activeOrganization =
      organizations.find((org) => org.id === cookieOrgId) ??
      fallbackOrganization;
    const activeMembership = membershipList.find(
      (m) => m.organization_id === activeOrganization.id,
    );

    // Полная запись организации, роль+права и модули — параллельно.
    const [organizationRes, roleBundle, orgModulesRes] = await Promise.all([
      supabase
        .from("organizations")
        .select("*")
        .eq("id", activeOrganization.id)
        .single(),
      // Роль и права (внутренняя цепочка roles → role_permissions → permissions).
      (async (): Promise<{
        role: OrganizationRole | null;
        permissions: string[];
      }> => {
        if (!activeMembership) return { role: null, permissions: [] };
        const { data: roleRow } = await supabase
          .from("roles")
          .select("id, key, name")
          .eq("id", activeMembership.role_id)
          .single();
        if (!roleRow) return { role: null, permissions: [] };
        const { data: rolePermissionRows } = await supabase
          .from("role_permissions")
          .select("permission_id")
          .eq("role_id", roleRow.id);
        const permissionIds = (rolePermissionRows ?? []).map(
          (rp) => rp.permission_id,
        );
        if (permissionIds.length === 0) {
          return { role: roleRow, permissions: [] };
        }
        const { data: permissionRows } = await supabase
          .from("permissions")
          .select("key")
          .in("id", permissionIds);
        return {
          role: roleRow,
          permissions: (permissionRows ?? []).map((p) => p.key),
        };
      })(),
      supabase
        .from("organization_modules")
        .select("module_id")
        .eq("organization_id", activeOrganization.id)
        .eq("enabled", true),
    ]);

    // Ключи включённых модулей.
    const moduleIds = (orgModulesRes.data ?? []).map((om) => om.module_id);
    let modules: string[] = [];
    if (moduleIds.length > 0) {
      const { data: moduleRows } = await supabase
        .from("modules")
        .select("key")
        .in("id", moduleIds);
      modules = (moduleRows ?? []).map((m) => m.key);
    }

    return {
      user,
      organizations,
      organization: organizationRes.data,
      role: roleBundle.role,
      permissions: roleBundle.permissions,
      modules,
      isSuperAdmin,
    };
  },
);

/**
 * Контекст организации; редирект на /login, если пользователь не
 * аутентифицирован. Контекст без организации возвращается как есть —
 * вызывающий код сам решает, что показать.
 */
export async function requireOrganizationContext(): Promise<OrganizationContext> {
  const context = await getOrganizationContext();
  if (!context) {
    redirect(ROUTES.auth.signIn);
  }
  return context;
}
