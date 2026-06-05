"use server";

import { randomBytes } from "node:crypto";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/server";
import { logAudit } from "@/server/audit";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

import { generateApiKey } from "./keys";
import { rotateWebhookSecret } from "./webhooks";
import {
  createApiKeySchema,
  deleteAgentConnectionSchema,
  deleteWebhookEndpointSchema,
  revokeApiKeySchema,
  saveAgentConnectionSchema,
  saveAgentFeedSettingsSchema,
  savePropertySyncSettingsSchema,
  saveWebhookEndpointSchema,
  setExternalVisibilitySchema,
  type ActionResult,
  type ActionResultWithKey,
  type CreateApiKeyInput,
  type DeleteAgentConnectionInput,
  type DeleteWebhookEndpointInput,
  type RevokeApiKeyInput,
  type SaveAgentConnectionInput,
  type SaveAgentFeedSettingsInput,
  type SavePropertySyncSettingsInput,
  type SaveWebhookEndpointInput,
  type SetExternalVisibilityInput,
} from "./schema";

/** Гард: активная организация + право analytics.view. */
async function requireAccess(): Promise<
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
      error: "You do not have permission to manage agent sync.",
    };
  }
  return {
    ok: true,
    organizationId: context.organization.id,
    userId: context.user.id,
  };
}

const ADMIN_PATH = "/dashboard/agent-sync";

// ---- API keys -----------------------------------------------

/** Создание API-ключа. Возвращает rawKey ОДИН РАЗ — больше его не увидеть. */
export async function createApiKey(
  input: CreateApiKeyInput,
): Promise<ActionResultWithKey> {
  const parsed = createApiKeySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the API key form." };
  }
  const data = parsed.data;
  const access = await requireAccess();
  if (!access.ok) {
    return access;
  }

  const { rawKey, keyHash, keyPrefix } = generateApiKey();
  const admin = createAdminClient();
  const { error } = await admin.from("api_keys").insert({
    organization_id: access.organizationId,
    agent_id: data.agentId,
    name: data.name,
    key_hash: keyHash,
    key_prefix: keyPrefix,
    scopes: data.scopes,
    allowed_domains: data.allowedDomains,
    rate_limit_per_minute: data.rateLimitPerMinute,
    created_by: access.userId,
  });
  if (error) {
    return { ok: false, error: "Could not create the API key." };
  }
  await logAudit({
    organizationId: access.organizationId,
    userId: access.userId,
    action: "agency_api.key_created",
    entityType: "api_key",
    metadata: { prefix: keyPrefix, name: data.name },
  });
  revalidatePath(ADMIN_PATH);
  return { ok: true, rawKey, prefix: keyPrefix };
}

/** Отзыв ключа (status=revoked + revoked_at). */
export async function revokeApiKey(
  input: RevokeApiKeyInput,
): Promise<ActionResult> {
  const parsed = revokeApiKeySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid key id." };
  }
  const access = await requireAccess();
  if (!access.ok) {
    return access;
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("api_keys")
    .update({ status: "revoked", revoked_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .eq("organization_id", access.organizationId);
  if (error) {
    return { ok: false, error: "Could not revoke the API key." };
  }
  await logAudit({
    organizationId: access.organizationId,
    userId: access.userId,
    action: "agency_api.key_revoked",
    entityType: "api_key",
    entityId: parsed.data.id,
  });
  revalidatePath(ADMIN_PATH);
  return { ok: true };
}

// ---- Agent website connections ------------------------------

export async function saveAgentConnection(
  input: SaveAgentConnectionInput,
): Promise<ActionResult> {
  const parsed = saveAgentConnectionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the connection form." };
  }
  const data = parsed.data;
  const access = await requireAccess();
  if (!access.ok) {
    return access;
  }
  const admin = createAdminClient();
  if (data.id) {
    const { error } = await admin
      .from("agent_website_connections")
      .update({
        agent_id: data.agentId,
        name: data.name,
        primary_domain: data.primaryDomain,
        canonical_owner: data.canonicalOwner,
        is_active: data.isActive,
      })
      .eq("id", data.id)
      .eq("organization_id", access.organizationId);
    if (error) {
      return { ok: false, error: "Could not update the connection." };
    }
  } else {
    const { error } = await admin
      .from("agent_website_connections")
      .insert({
        organization_id: access.organizationId,
        agent_id: data.agentId,
        name: data.name,
        primary_domain: data.primaryDomain,
        canonical_owner: data.canonicalOwner,
        is_active: data.isActive,
      });
    if (error) {
      return { ok: false, error: "Could not create the connection." };
    }
  }
  revalidatePath(ADMIN_PATH);
  return { ok: true };
}

export async function deleteAgentConnection(
  input: DeleteAgentConnectionInput,
): Promise<ActionResult> {
  const parsed = deleteAgentConnectionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid connection id." };
  }
  const access = await requireAccess();
  if (!access.ok) {
    return access;
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("agent_website_connections")
    .delete()
    .eq("id", parsed.data.id)
    .eq("organization_id", access.organizationId);
  if (error) {
    return { ok: false, error: "Could not remove the connection." };
  }
  revalidatePath(ADMIN_PATH);
  return { ok: true };
}

// ---- Webhook endpoints --------------------------------------

export async function saveWebhookEndpoint(
  input: SaveWebhookEndpointInput,
): Promise<ActionResult> {
  const parsed = saveWebhookEndpointSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the webhook form." };
  }
  const data = parsed.data;
  const access = await requireAccess();
  if (!access.ok) {
    return access;
  }
  const admin = createAdminClient();
  if (data.id) {
    const { error } = await admin
      .from("webhook_endpoints")
      .update({
        agent_website_connection_id: data.agentWebsiteConnectionId,
        url: data.url,
        secret: data.secret,
        event_types: data.eventTypes,
        is_active: data.isActive,
      })
      .eq("id", data.id)
      .eq("organization_id", access.organizationId);
    if (error) {
      return { ok: false, error: "Could not update the webhook." };
    }
  } else {
    const { error } = await admin.from("webhook_endpoints").insert({
      organization_id: access.organizationId,
      agent_website_connection_id: data.agentWebsiteConnectionId,
      url: data.url,
      secret: data.secret,
      event_types: data.eventTypes,
      is_active: data.isActive,
    });
    if (error) {
      return { ok: false, error: "Could not create the webhook." };
    }
  }
  revalidatePath(ADMIN_PATH);
  return { ok: true };
}

export async function deleteWebhookEndpoint(
  input: DeleteWebhookEndpointInput,
): Promise<ActionResult> {
  const parsed = deleteWebhookEndpointSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid webhook id." };
  }
  const access = await requireAccess();
  if (!access.ok) {
    return access;
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("webhook_endpoints")
    .delete()
    .eq("id", parsed.data.id)
    .eq("organization_id", access.organizationId);
  if (error) {
    return { ok: false, error: "Could not remove the webhook." };
  }
  revalidatePath(ADMIN_PATH);
  return { ok: true };
}

export type RotateWebhookSecretResult =
  | { ok: true; secret: string }
  | { ok: false; error: string };

/** Генерирует надёжный webhook-секрет на сервере (клиент его не выбирает). */
function generateWebhookSecret(): string {
  return `whsec_${randomBytes(24).toString("hex")}`;
}

/**
 * Ротация секрета webhook-эндпоинта: текущий секрет уходит в previous_secret
 * (грейс-период для проверки подписи), новый — primary. Возвращает новый
 * секрет ОДИН РАЗ для показа.
 */
export async function rotateWebhookEndpointSecret(
  input: DeleteWebhookEndpointInput,
): Promise<RotateWebhookSecretResult> {
  const parsed = deleteWebhookEndpointSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid webhook id." };
  }
  const access = await requireAccess();
  if (!access.ok) {
    return access;
  }
  const secret = generateWebhookSecret();
  const result = await rotateWebhookSecret(
    access.organizationId,
    parsed.data.id,
    secret,
  );
  if (!result.ok) {
    return { ok: false, error: "Webhook not found." };
  }
  await logAudit({
    organizationId: access.organizationId,
    userId: access.userId,
    action: "webhook.secret_rotated",
    entityType: "webhook_endpoint",
    entityId: parsed.data.id,
  });
  revalidatePath(ADMIN_PATH);
  return { ok: true, secret };
}

// ---- External visibility -----------------------------------

export async function setExternalVisibility(
  input: SetExternalVisibilityInput,
): Promise<ActionResult> {
  const parsed = setExternalVisibilitySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid visibility input." };
  }
  const data = parsed.data;
  const access = await requireAccess();
  if (!access.ok) {
    return access;
  }
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("property_external_visibility")
    .select("id")
    .eq("property_id", data.propertyId)
    .eq("agent_website_connection_id", data.agentWebsiteConnectionId)
    .maybeSingle();
  if (existing) {
    const { error } = await admin
      .from("property_external_visibility")
      .update({ visible: data.visible })
      .eq("id", existing.id);
    if (error) {
      return { ok: false, error: "Could not update visibility." };
    }
  } else {
    const { error } = await admin.from("property_external_visibility").insert({
      organization_id: access.organizationId,
      property_id: data.propertyId,
      agent_website_connection_id: data.agentWebsiteConnectionId,
      visible: data.visible,
    });
    if (error) {
      return { ok: false, error: "Could not set visibility." };
    }
  }
  revalidatePath(ADMIN_PATH);
  return { ok: true };
}

// ---- Sync settings ------------------------------------------

export async function savePropertySyncSettings(
  input: SavePropertySyncSettingsInput,
): Promise<ActionResult> {
  const parsed = savePropertySyncSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the sync settings form." };
  }
  const data = parsed.data;
  const access = await requireAccess();
  if (!access.ok) {
    return access;
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("property_sync_settings")
    .upsert(
      {
        organization_id: access.organizationId,
        default_canonical_owner: data.defaultCanonicalOwner,
        hide_owner_contacts: data.hideOwnerContacts,
        hide_internal_notes: data.hideInternalNotes,
        hide_commission: data.hideCommission,
        hide_private_documents: data.hidePrivateDocuments,
      },
      { onConflict: "organization_id" },
    );
  if (error) {
    return { ok: false, error: "Could not save sync settings." };
  }
  revalidatePath(ADMIN_PATH);
  return { ok: true };
}

export async function saveAgentFeedSettings(
  input: SaveAgentFeedSettingsInput,
): Promise<ActionResult> {
  const parsed = saveAgentFeedSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the feed settings form." };
  }
  const data = parsed.data;
  const access = await requireAccess();
  if (!access.ok) {
    return access;
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("agent_feed_settings")
    .upsert(
      {
        organization_id: access.organizationId,
        agent_website_connection_id: data.agentWebsiteConnectionId,
        default_locale: data.defaultLocale,
        default_currency: data.defaultCurrency,
      },
      { onConflict: "agent_website_connection_id" },
    );
  if (error) {
    return { ok: false, error: "Could not save feed settings." };
  }
  revalidatePath(ADMIN_PATH);
  return { ok: true };
}
