"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/server";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";
import type { Json } from "@/types/database";

import {
  saveTrackingSettingsSchema,
  type ActionResult,
  type SaveTrackingSettingsInput,
} from "./schema";

/** Гард: активная организация + право analytics.view. */
async function requireAnalyticsAccess(): Promise<
  { ok: true; organizationId: string } | { ok: false; error: string }
> {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false, error: "No active organization." };
  }
  if (!hasPermission(context, "analytics.view")) {
    return {
      ok: false,
      error: "You do not have permission to manage analytics.",
    };
  }
  return { ok: true, organizationId: context.organization.id };
}

/** Сохраняет настройки tracking-интеграций организации. */
export async function saveTrackingSettings(
  input: SaveTrackingSettingsInput,
): Promise<ActionResult> {
  const parsed = saveTrackingSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the tracking settings." };
  }
  const data = parsed.data;
  const access = await requireAnalyticsAccess();
  if (!access.ok) {
    return access;
  }

  const admin = createAdminClient();
  const { error } = await admin.from("tracking_settings").upsert(
    {
      organization_id: access.organizationId,
      ga4_measurement_id: data.ga4MeasurementId,
      gtm_id: data.gtmId,
      ga4_enabled: data.ga4Enabled,
      meta_pixel_id: data.metaPixelId,
      meta_capi_token: data.metaCapiToken,
      meta_pixel_enabled: data.metaPixelEnabled,
      google_ads_conversion_id: data.googleAdsConversionId,
      google_ads_labels: data.googleAdsLabels as Json,
      consent_mode_enabled: data.consentModeEnabled,
    },
    { onConflict: "organization_id" },
  );
  if (error) {
    return { ok: false, error: "Could not save the tracking settings." };
  }

  revalidatePath("/dashboard/analytics");
  return { ok: true };
}
