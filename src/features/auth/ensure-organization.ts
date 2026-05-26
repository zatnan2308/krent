import { cookies } from "next/headers";

import { ACTIVE_ORG_COOKIE } from "@/server/organization-context";
import { createAdminClient } from "@/lib/supabase/server";

/** Транслитерирует/упрощает строку в slug (a-z, 0-9, дефисы). */
function toSlug(value: string): string {
  const cleaned = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || `org-${Date.now().toString(36)}`;
}

/** Гарантирует, что у пользователя есть хотя бы одна организация и активное
 *  членство в ней. Если нет — создаёт новую, делает пользователя org_owner
 *  и устанавливает cookie с активной организацией.
 *
 *  Безопасна для повторных вызовов — если организация уже есть, ничего
 *  не делает.  */
export async function ensureUserHasOrganization(input: {
  userId: string;
  fullName: string;
  email: string;
}): Promise<void> {
  const admin = createAdminClient();

  // Уже есть активное членство — ничего не делаем.
  const { data: existing } = await admin
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", input.userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (existing) {
    // Удостоверимся, что cookie указывает на эту организацию.
    try {
      cookies().set(ACTIVE_ORG_COOKIE, existing.organization_id, {
        path: "/",
        sameSite: "lax",
      });
    } catch {
      // Можно вызвать из server-component без write-access — это нормально.
    }
    return;
  }

  const baseName =
    (input.fullName && input.fullName.trim()) ||
    input.email.split("@")[0] ||
    "My organization";
  const baseSlug = toSlug(baseName);

  // Подберём уникальный slug — на случай коллизии с существующей организацией.
  let slug = baseSlug;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const { data: clash } = await admin
      .from("organizations")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!clash) break;
    slug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;
  }

  const { data: organization, error: orgError } = await admin
    .from("organizations")
    .insert({
      name: baseName,
      slug,
      type: "agency",
      status: "active",
    })
    .select("id")
    .single();
  if (orgError || !organization) {
    throw new Error(`Could not create organization: ${orgError?.message}`);
  }

  // Системная роль org_owner — нет organization_id (общая для всех).
  const { data: ownerRole, error: roleError } = await admin
    .from("roles")
    .select("id")
    .eq("key", "org_owner")
    .is("organization_id", null)
    .single();
  if (roleError || !ownerRole) {
    throw new Error("System role org_owner not found.");
  }

  const { error: memberError } = await admin
    .from("organization_members")
    .insert({
      organization_id: organization.id,
      user_id: input.userId,
      role_id: ownerRole.id,
      status: "active",
    });
  if (memberError) {
    throw new Error(`Could not add member: ${memberError.message}`);
  }

  // Включаем все системные модули для новой организации.
  const { data: modules } = await admin
    .from("modules")
    .select("id");
  if (modules && modules.length > 0) {
    await admin.from("organization_modules").insert(
      modules.map((module) => ({
        organization_id: organization.id,
        module_id: module.id,
        enabled: true,
      })),
    );
  }

  try {
    cookies().set(ACTIVE_ORG_COOKIE, organization.id, {
      path: "/",
      sameSite: "lax",
    });
  } catch {
    // ignore — будет установлено при следующем login.
  }
}
