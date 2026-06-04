import { cache } from "react";

import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { unstable_cache } from "next/cache";
import { redirect } from "next/navigation";

import { ROUTES } from "@/lib/constants/routes";
import { createAdminClient } from "@/lib/supabase/server";
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

/** Тег кэша контекста — сбрасывается при смене ролей/модулей/членства. */
export const ORG_CONTEXT_TAG = "org-context";

/** Тяжёлая часть контекста без user (organizations/role/permissions/modules). */
type OrgData = Omit<OrganizationContext, "user">;

/**
 * Грузит данные организации по доверенному userId (admin-клиент, мимо RLS) и
 * кэширует на 30с по (userId, activeOrgId). Это убирает ~6 round-trip к БД с
 * КАЖДОЙ навигации по дашборду — пересчёт только раз в 30с или при сбросе тега.
 * Внутри независимые запросы идут параллельно.
 */
const loadOrgData = unstable_cache(
  async (userId: string, cookieOrgId: string | null): Promise<OrgData> => {
    const admin = createAdminClient();

    const [membershipsRes, adminRes] = await Promise.all([
      admin
        .from("organization_members")
        .select("organization_id, role_id")
        .eq("user_id", userId)
        .eq("status", "active"),
      admin
        .from("platform_admins")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);
    const membershipList = membershipsRes.data ?? [];
    const isSuperAdmin = adminRes.data !== null;

    const empty: OrgData = {
      organizations: [],
      organization: null,
      role: null,
      permissions: [],
      modules: [],
      isSuperAdmin,
    };
    if (membershipList.length === 0) {
      return empty;
    }

    const organizationIds = membershipList.map((m) => m.organization_id);
    const { data: orgRows } = await admin
      .from("organizations")
      .select("id, name, slug")
      .in("id", organizationIds)
      .order("name");
    const organizations: OrganizationSummary[] = orgRows ?? [];

    const fallbackOrganization = organizations[0];
    if (!fallbackOrganization) {
      return empty;
    }

    const activeOrganization =
      organizations.find((org) => org.id === cookieOrgId) ??
      fallbackOrganization;
    const activeMembership = membershipList.find(
      (m) => m.organization_id === activeOrganization.id,
    );

    const [organizationRes, roleBundle, orgModulesRes] = await Promise.all([
      admin
        .from("organizations")
        .select("*")
        .eq("id", activeOrganization.id)
        .single(),
      (async (): Promise<{
        role: OrganizationRole | null;
        permissions: string[];
      }> => {
        if (!activeMembership) return { role: null, permissions: [] };
        const { data: roleRow } = await admin
          .from("roles")
          .select("id, key, name")
          .eq("id", activeMembership.role_id)
          .single();
        if (!roleRow) return { role: null, permissions: [] };
        const { data: rolePermissionRows } = await admin
          .from("role_permissions")
          .select("permission_id")
          .eq("role_id", roleRow.id);
        const permissionIds = (rolePermissionRows ?? []).map(
          (rp) => rp.permission_id,
        );
        if (permissionIds.length === 0) {
          return { role: roleRow, permissions: [] };
        }
        const { data: permissionRows } = await admin
          .from("permissions")
          .select("key")
          .in("id", permissionIds);
        return {
          role: roleRow,
          permissions: (permissionRows ?? []).map((p) => p.key),
        };
      })(),
      admin
        .from("organization_modules")
        .select("module_id")
        .eq("organization_id", activeOrganization.id)
        .eq("enabled", true),
    ]);

    const moduleIds = (orgModulesRes.data ?? []).map((om) => om.module_id);
    let modules: string[] = [];
    if (moduleIds.length > 0) {
      const { data: moduleRows } = await admin
        .from("modules")
        .select("key")
        .in("id", moduleIds);
      modules = (moduleRows ?? []).map((m) => m.key);
    }

    return {
      organizations,
      organization: organizationRes.data,
      role: roleBundle.role,
      permissions: roleBundle.permissions,
      modules,
      isSuperAdmin,
    };
  },
  ["org-context-data"],
  { revalidate: 30, tags: [ORG_CONTEXT_TAG] },
);

/**
 * Контекст организации текущего запроса: верифицирует пользователя (getUser),
 * затем берёт закэшированные данные организации. Обёрнут в React cache() —
 * один проход на запрос (layout + page).
 */
export const getOrganizationContext = cache(
  async function getOrganizationContextImpl(): Promise<OrganizationContext | null> {
    const user = await getCurrentUser();
    if (!user) {
      return null;
    }
    const cookieOrgId = cookies().get(ACTIVE_ORG_COOKIE)?.value ?? null;
    const data = await loadOrgData(user.id, cookieOrgId);
    return { user, ...data };
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
