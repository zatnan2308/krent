"use server";

import { randomBytes } from "node:crypto";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/server";
import { logAudit } from "@/server/audit";
import { requireUser } from "@/server/auth";
import { requireSuperAdmin } from "@/server/permissions";
import type { Enums } from "@/types/database";

const installationTypeSchema = z.enum([
  "solo_realtor_installation",
  "agency_installation",
  "property_management_installation",
  "custom_installation",
] as const satisfies readonly Enums<"license_installation_type">[]);

const licenseStatusSchema = z.enum([
  "active",
  "suspended",
  "expired",
  "revoked",
] as const satisfies readonly Enums<"license_status">[]);

const createLicenseSchema = z.object({
  organizationId: z.guid(),
  clientName: z.string().trim().min(1).max(200),
  clientEmail: z.email().nullable(),
  domain: z.string().trim().max(200).nullable(),
  installationType: installationTypeSchema,
  productVersion: z.string().trim().max(60).nullable(),
  supportUntil: z.string().min(1).nullable(),
  updatesUntil: z.string().min(1).nullable(),
  expiresAt: z.string().min(1).nullable(),
  notes: z.string().trim().max(2000).nullable(),
});
export type CreateLicenseInput = z.infer<typeof createLicenseSchema>;

const updateLicenseSchema = z.object({
  id: z.guid(),
  status: licenseStatusSchema,
  clientName: z.string().trim().min(1).max(200),
  clientEmail: z.email().nullable(),
  domain: z.string().trim().max(200).nullable(),
  installationType: installationTypeSchema,
  productVersion: z.string().trim().max(60).nullable(),
  supportUntil: z.string().min(1).nullable(),
  updatesUntil: z.string().min(1).nullable(),
  expiresAt: z.string().min(1).nullable(),
  notes: z.string().trim().max(2000).nullable(),
});
export type UpdateLicenseInput = z.infer<typeof updateLicenseSchema>;

export type LicenseActionResult =
  | { ok: true; licenseKey?: string }
  | { ok: false; error: string };

function generateLicenseKey(): string {
  const bytes = randomBytes(20).toString("hex"); // 40 hex chars
  return `krent_lic_${bytes}`;
}

const ADMIN_PATH = "/super-admin/licenses";

/** Создаёт лицензию (Super Admin only). license_key генерируется на сервере. */
export async function createLicense(
  input: CreateLicenseInput,
): Promise<LicenseActionResult> {
  await requireSuperAdmin();
  const parsed = createLicenseSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the license form." };
  }
  const data = parsed.data;
  const admin = createAdminClient();
  const licenseKey = generateLicenseKey();
  const { error } = await admin.from("licenses").insert({
    organization_id: data.organizationId,
    license_key: licenseKey,
    status: "active",
    installation_type: data.installationType,
    client_name: data.clientName,
    client_email: data.clientEmail,
    domain: data.domain,
    product_version: data.productVersion,
    support_until: data.supportUntil,
    updates_until: data.updatesUntil,
    expires_at: data.expiresAt,
    notes: data.notes,
  });
  if (error) {
    return { ok: false, error: "Could not create the license." };
  }
  const user = await requireUser();
  await logAudit({
    organizationId: data.organizationId,
    userId: user.id,
    action: "license.issued",
    entityType: "license",
    metadata: {
      installation_type: data.installationType,
      domain: data.domain,
      client_name: data.clientName,
    },
  });
  revalidatePath(ADMIN_PATH);
  revalidatePath(`/super-admin/organizations/${data.organizationId}`);
  return { ok: true, licenseKey };
}

/** Обновляет поля выданной лицензии. */
export async function updateLicense(
  input: UpdateLicenseInput,
): Promise<LicenseActionResult> {
  await requireSuperAdmin();
  const parsed = updateLicenseSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the license form." };
  }
  const data = parsed.data;
  const admin = createAdminClient();
  const { error } = await admin
    .from("licenses")
    .update({
      status: data.status,
      installation_type: data.installationType,
      client_name: data.clientName,
      client_email: data.clientEmail,
      domain: data.domain,
      product_version: data.productVersion,
      support_until: data.supportUntil,
      updates_until: data.updatesUntil,
      expires_at: data.expiresAt,
      notes: data.notes,
    })
    .eq("id", data.id);
  if (error) {
    return { ok: false, error: "Could not update the license." };
  }
  revalidatePath(ADMIN_PATH);
  return { ok: true };
}

export async function setLicenseStatus(
  id: string,
  status: Enums<"license_status">,
): Promise<LicenseActionResult> {
  await requireSuperAdmin();
  if (!z.guid().safeParse(id).success) {
    return { ok: false, error: "Invalid license id." };
  }
  if (!licenseStatusSchema.safeParse(status).success) {
    return { ok: false, error: "Invalid license status." };
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("licenses")
    .update({ status })
    .eq("id", id);
  if (error) {
    return { ok: false, error: "Could not change license status." };
  }
  const user = await requireUser();
  await logAudit({
    organizationId: null,
    userId: user.id,
    action: "license.status_changed",
    entityType: "license",
    entityId: id,
    metadata: { status },
  });
  revalidatePath(ADMIN_PATH);
  return { ok: true };
}
