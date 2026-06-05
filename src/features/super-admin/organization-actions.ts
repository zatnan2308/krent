"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/server";
import { logAudit } from "@/server/audit";
import { requireUser } from "@/server/auth";
import { requireSuperAdmin } from "@/server/permissions";
import type { Enums } from "@/types/database";

const organizationStatusSchema = z.enum([
  "active",
  "inactive",
  "suspended",
] as const satisfies readonly Enums<"organization_status">[]);

export type SuperAdminActionResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Меняет статус организации (Super Admin only). suspended/inactive отключают
 * доступ тенанта; active возвращает. Действие пишется в журнал аудита.
 */
export async function setOrganizationStatus(
  id: string,
  status: Enums<"organization_status">,
): Promise<SuperAdminActionResult> {
  await requireSuperAdmin();
  if (!z.guid().safeParse(id).success) {
    return { ok: false, error: "Invalid organization id." };
  }
  if (!organizationStatusSchema.safeParse(status).success) {
    return { ok: false, error: "Invalid organization status." };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("organizations")
    .update({ status })
    .eq("id", id)
    .select("id");
  if (error) {
    return { ok: false, error: "Could not change the organization status." };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "Organization not found." };
  }

  const user = await requireUser();
  await logAudit({
    organizationId: id,
    userId: user.id,
    action: "organization.status_changed",
    entityType: "organization",
    entityId: id,
    metadata: { status },
  });

  revalidatePath(`/super-admin/organizations/${id}`);
  revalidatePath("/super-admin/organizations");
  return { ok: true };
}
