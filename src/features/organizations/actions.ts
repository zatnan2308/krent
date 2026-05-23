"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/server/auth";
import { ACTIVE_ORG_COOKIE } from "@/server/organization-context";

/**
 * Делает организацию активной для текущего пользователя.
 * Членство проверяется на сервере — cookie сама по себе не является
 * основанием доступа.
 */
export async function setActiveOrganization(
  organizationId: string,
): Promise<void> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Not authenticated.");
  }

  const supabase = createClient();
  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .maybeSingle();

  if (!membership) {
    throw new Error("You are not a member of this organization.");
  }

  cookies().set(ACTIVE_ORG_COOKIE, organizationId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  revalidatePath("/dashboard", "layout");
}
