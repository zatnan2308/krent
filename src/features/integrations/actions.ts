"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/server";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

import { DEFAULT_SCOPES } from "./constants";
import {
  connectGoogleAdsSchema,
  connectGscSchema,
  connectMetaAdsSchema,
  type ActionResult,
  type ConnectGoogleAdsInput,
  type ConnectGscInput,
  type ConnectMetaAdsInput,
} from "./schema";
import type { IntegrationProvider } from "./types";

/** Гард: активная организация + право analytics.view. */
async function requireIntegrationAccess(): Promise<
  | { ok: true; organizationId: string; userId: string }
  | { ok: false; error: string }
> {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false, error: "No active organization." };
  }
  if (!hasPermission(context, "analytics.view")) {
    return {
      ok: false,
      error: "You do not have permission to manage integrations.",
    };
  }
  return {
    ok: true,
    organizationId: context.organization.id,
    userId: context.user.id,
  };
}

type Admin = ReturnType<typeof createAdminClient>;

/** Создаёт или обновляет integration_connections для пары (org, provider, account). */
async function upsertIntegration(
  admin: Admin,
  organizationId: string,
  userId: string,
  provider: IntegrationProvider,
  accountId: string,
  displayName: string,
  scopes: string[],
): Promise<string | null> {
  const { data: existing } = await admin
    .from("integration_connections")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("provider", provider)
    .eq("account_id", accountId)
    .maybeSingle();
  if (existing) {
    const { error } = await admin
      .from("integration_connections")
      .update({
        display_name: displayName,
        scopes,
        status: "pending",
        error_message: null,
      })
      .eq("id", existing.id);
    if (error) {
      return null;
    }
    return existing.id;
  }
  const { data: created, error } = await admin
    .from("integration_connections")
    .insert({
      organization_id: organizationId,
      provider,
      account_id: accountId,
      display_name: displayName,
      scopes,
      status: "connected",
      created_by: userId,
    })
    .select("id")
    .single();
  if (error || !created) {
    return null;
  }
  return created.id;
}

/** Подключение Search Console. */
export async function connectGsc(
  input: ConnectGscInput,
): Promise<ActionResult> {
  const parsed = connectGscSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the Search Console fields." };
  }
  const data = parsed.data;
  const access = await requireIntegrationAccess();
  if (!access.ok) {
    return access;
  }

  const admin = createAdminClient();
  const connectionId = await upsertIntegration(
    admin,
    access.organizationId,
    access.userId,
    "gsc",
    data.accountId,
    data.displayName,
    DEFAULT_SCOPES.gsc,
  );
  if (!connectionId) {
    return { ok: false, error: "Could not create the connection." };
  }

  const { data: existing } = await admin
    .from("google_search_console_connections")
    .select("id")
    .eq("integration_connection_id", connectionId)
    .maybeSingle();
  if (existing) {
    await admin
      .from("google_search_console_connections")
      .update({ site_url: data.siteUrl, verified: false })
      .eq("id", existing.id);
  } else {
    await admin.from("google_search_console_connections").insert({
      organization_id: access.organizationId,
      integration_connection_id: connectionId,
      site_url: data.siteUrl,
    });
  }

  revalidatePath("/dashboard/integrations");
  return { ok: true };
}

/** Подключение Google Ads. */
export async function connectGoogleAds(
  input: ConnectGoogleAdsInput,
): Promise<ActionResult> {
  const parsed = connectGoogleAdsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the Google Ads fields." };
  }
  const data = parsed.data;
  const access = await requireIntegrationAccess();
  if (!access.ok) {
    return access;
  }

  const admin = createAdminClient();
  const connectionId = await upsertIntegration(
    admin,
    access.organizationId,
    access.userId,
    "google_ads",
    data.customerId,
    data.displayName,
    DEFAULT_SCOPES.google_ads,
  );
  if (!connectionId) {
    return { ok: false, error: "Could not create the connection." };
  }

  const { data: existing } = await admin
    .from("google_ads_connections")
    .select("id")
    .eq("integration_connection_id", connectionId)
    .maybeSingle();
  if (existing) {
    await admin
      .from("google_ads_connections")
      .update({
        customer_id: data.customerId,
        manager_customer_id: data.managerCustomerId,
        currency: data.currency,
      })
      .eq("id", existing.id);
  } else {
    await admin.from("google_ads_connections").insert({
      organization_id: access.organizationId,
      integration_connection_id: connectionId,
      customer_id: data.customerId,
      manager_customer_id: data.managerCustomerId,
      currency: data.currency,
    });
  }

  revalidatePath("/dashboard/integrations");
  return { ok: true };
}

/** Подключение Meta Ads. */
export async function connectMetaAds(
  input: ConnectMetaAdsInput,
): Promise<ActionResult> {
  const parsed = connectMetaAdsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the Meta Ads fields." };
  }
  const data = parsed.data;
  const access = await requireIntegrationAccess();
  if (!access.ok) {
    return access;
  }

  const admin = createAdminClient();
  const connectionId = await upsertIntegration(
    admin,
    access.organizationId,
    access.userId,
    "meta_ads",
    data.adAccountId,
    data.displayName,
    DEFAULT_SCOPES.meta_ads,
  );
  if (!connectionId) {
    return { ok: false, error: "Could not create the connection." };
  }

  const { data: existing } = await admin
    .from("meta_ads_connections")
    .select("id")
    .eq("integration_connection_id", connectionId)
    .maybeSingle();
  if (existing) {
    await admin
      .from("meta_ads_connections")
      .update({
        ad_account_id: data.adAccountId,
        business_id: data.businessId,
        currency: data.currency,
      })
      .eq("id", existing.id);
  } else {
    await admin.from("meta_ads_connections").insert({
      organization_id: access.organizationId,
      integration_connection_id: connectionId,
      ad_account_id: data.adAccountId,
      business_id: data.businessId,
      currency: data.currency,
    });
  }

  revalidatePath("/dashboard/integrations");
  return { ok: true };
}

/** Отключает интеграцию: удаляет токены и помечает статус. */
export async function disconnectIntegration(
  connectionId: string,
): Promise<ActionResult> {
  if (!z.uuid().safeParse(connectionId).success) {
    return { ok: false, error: "Invalid connection." };
  }
  const access = await requireIntegrationAccess();
  if (!access.ok) {
    return access;
  }

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("integration_connections")
    .select("id")
    .eq("id", connectionId)
    .eq("organization_id", access.organizationId)
    .maybeSingle();
  if (!existing) {
    return { ok: false, error: "Connection not found." };
  }

  await admin
    .from("integration_tokens")
    .delete()
    .eq("integration_connection_id", connectionId);
  await admin
    .from("integration_connections")
    .update({ status: "disconnected" })
    .eq("id", connectionId);

  revalidatePath("/dashboard/integrations");
  return { ok: true };
}
