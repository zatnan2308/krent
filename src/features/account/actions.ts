"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/server/auth";

export interface AccountActionResult {
  ok: boolean;
  error?: string;
  message?: string;
}

/**
 * Запрос на удаление аккаунта. Удаление необратимо и может затрагивать
 * активные брони, поэтому мы не удаляем пользователя мгновенно, а создаём
 * уведомление-лид агенту, который подтверждает удаление вручную (как в
 * дизайне — «confirm within 24h»).
 */
export async function requestAccountDeletion(): Promise<AccountActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "You are not signed in." };
  }

  const supabase = createClient();
  const { data: account } = await supabase
    .from("portal_accounts")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!account) {
    return {
      ok: false,
      error: "No client account is linked to this profile.",
    };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("leads").insert({
    organization_id: account.organization_id,
    contact_id: account.contact_id,
    type: "buyer",
    status: "new",
    source: "account_deletion",
    message: `Client requested account deletion via the account area (${user.email ?? "no email on file"}).`,
    language: "en",
  });

  if (error) {
    return {
      ok: false,
      error: "Could not submit the request. Please try again.",
    };
  }

  return {
    ok: true,
    message:
      "Account deletion requested. Your agent will confirm within 24 hours.",
  };
}
