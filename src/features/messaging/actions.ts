"use server";

import { revalidatePath } from "next/cache";

import { getClientEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/types/database";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

import { telegramGetMe, telegramSetWebhook } from "./adapters/telegram";
import { getTelegramConfig } from "./config";
import type { ActionResult } from "./schema";
import type { MessagingChannel } from "./types";

const INTEGRATIONS_PATH = "/dashboard/integrations";

/** Гард: активная организация + право управлять интеграциями. */
async function requireChannelAccess(): Promise<
  { ok: true; organizationId: string; userId: string } | { ok: false; error: string }
> {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false, error: "No active organization." };
  }
  if (!hasPermission(context, "analytics.view")) {
    return {
      ok: false,
      error: "You do not have permission to manage messaging channels.",
    };
  }
  return {
    ok: true,
    organizationId: context.organization.id,
    userId: context.user.id,
  };
}

/** Upsert строки подключения канала (одна на канал на организацию). */
async function upsertConnection(
  admin: ReturnType<typeof createAdminClient>,
  organizationId: string,
  channel: MessagingChannel,
  fields: TablesUpdate<"messaging_connections">,
): Promise<void> {
  const { data: existing } = await admin
    .from("messaging_connections")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("channel", channel)
    .maybeSingle();
  if (existing) {
    await admin
      .from("messaging_connections")
      .update(fields)
      .eq("id", existing.id);
  } else {
    await admin
      .from("messaging_connections")
      .insert({ organization_id: organizationId, channel, ...fields });
  }
}

/**
 * Подключает Telegram: токен берётся из env (TELEGRAM_BOT_TOKEN), валидируется
 * через getMe, регистрируется вебхук с секретом, запись подключения помечается
 * connected. Никакого ввода токена в UI — self-hosted, креды в env.
 */
export async function connectTelegram(): Promise<ActionResult> {
  const access = await requireChannelAccess();
  if (!access.ok) {
    return access;
  }
  const config = getTelegramConfig();
  if (!config) {
    return {
      ok: false,
      error: "Set TELEGRAM_BOT_TOKEN in the environment first (see SETUP.md).",
    };
  }
  const me = await telegramGetMe(config.botToken);
  if (!me.ok) {
    return { ok: false, error: me.error };
  }
  const webhookUrl = `${getClientEnv().NEXT_PUBLIC_SITE_URL}/api/webhooks/telegram`;
  const hook = await telegramSetWebhook(
    config.botToken,
    webhookUrl,
    config.webhookSecret,
  );
  if (!hook.ok) {
    return { ok: false, error: hook.error ?? "Could not register webhook." };
  }

  const admin = createAdminClient();
  await upsertConnection(admin, access.organizationId, "telegram", {
    bot_username: me.username,
    display_name: `@${me.username}`,
    status: "connected",
    error_message: null,
    created_by: access.userId,
  });
  revalidatePath(INTEGRATIONS_PATH);
  return { ok: true };
}

/** Помечает канал отключённым (вебхук Telegram можно снять вручную). */
export async function disconnectChannel(
  channel: MessagingChannel,
): Promise<ActionResult> {
  const access = await requireChannelAccess();
  if (!access.ok) {
    return access;
  }
  const admin = createAdminClient();
  await admin
    .from("messaging_connections")
    .update({ status: "disconnected" })
    .eq("organization_id", access.organizationId)
    .eq("channel", channel);
  revalidatePath(INTEGRATIONS_PATH);
  return { ok: true };
}
