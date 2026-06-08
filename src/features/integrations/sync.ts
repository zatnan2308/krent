import { decryptToken, encryptToken } from "@/lib/encryption";
import { getServerEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

type Admin = ReturnType<typeof createAdminClient>;
type Connection = Pick<
  Tables<"integration_connections">,
  "id" | "organization_id" | "provider"
>;

/** Итог синка. */
export interface IntegrationsSyncSummary {
  total: number;
  synced: number;
  failed: number;
}

const YMD = (date: Date): string => date.toISOString().slice(0, 10);

/**
 * Возвращает действующий Google access-token коннекта: при истечении
 * обновляет его по refresh-токену и перешифровывает в хранилище.
 */
async function loadGoogleAccessToken(
  admin: Admin,
  connectionId: string,
): Promise<string | null> {
  const { data: tokens } = await admin
    .from("integration_tokens")
    .select("token_type, encrypted_value, expires_at")
    .eq("integration_connection_id", connectionId);
  const list = tokens ?? [];
  const access = list.find((token) => token.token_type === "access");
  const refresh = list.find((token) => token.token_type === "refresh");
  if (!access) {
    return null;
  }

  const stillValid =
    !access.expires_at ||
    new Date(access.expires_at).getTime() > Date.now() + 60_000;
  if (stillValid) {
    try {
      return decryptToken(access.encrypted_value);
    } catch {
      return null;
    }
  }

  // Истёк — пытаемся обновить по refresh-токену.
  if (!refresh) {
    return null;
  }
  const env = getServerEnv();
  if (!env.GOOGLE_OAUTH_CLIENT_ID || !env.GOOGLE_OAUTH_CLIENT_SECRET) {
    return null;
  }
  let refreshToken: string;
  try {
    refreshToken = decryptToken(refresh.encrypted_value);
  } catch {
    return null;
  }
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.GOOGLE_OAUTH_CLIENT_ID,
        client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }).toString(),
    });
    if (!response.ok) {
      return null;
    }
    const json = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
    };
    if (!json.access_token) {
      return null;
    }
    const expiresAt = json.expires_in
      ? new Date(Date.now() + json.expires_in * 1000).toISOString()
      : null;
    await admin
      .from("integration_tokens")
      .update({
        encrypted_value: encryptToken(json.access_token),
        expires_at: expiresAt,
      })
      .eq("integration_connection_id", connectionId)
      .eq("token_type", "access");
    return json.access_token;
  } catch {
    return null;
  }
}

interface GscRow {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
}

/** Реальный синк Google Search Console (searchAnalytics за 28 дней по дате). */
async function syncSearchConsole(
  admin: Admin,
  connection: Connection,
): Promise<{ ok: boolean; message: string }> {
  const { data: gsc } = await admin
    .from("google_search_console_connections")
    .select("site_url")
    .eq("integration_connection_id", connection.id)
    .maybeSingle();
  if (!gsc) {
    return { ok: false, message: "No Search Console site configured." };
  }
  const accessToken = await loadGoogleAccessToken(admin, connection.id);
  if (!accessToken) {
    return { ok: false, message: "No valid access token (reconnect needed)." };
  }

  const endDate = new Date();
  const startDate = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);
  let response: Response;
  try {
    response = await fetch(
      `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
        gsc.site_url,
      )}/searchAnalytics/query`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          startDate: YMD(startDate),
          endDate: YMD(endDate),
          dimensions: ["date"],
          rowLimit: 1000,
        }),
      },
    );
  } catch {
    return { ok: false, message: "Search Console request failed." };
  }
  if (!response.ok) {
    return {
      ok: false,
      message: `Search Console API error ${response.status}.`,
    };
  }
  const json = (await response.json()) as { rows?: GscRow[] };
  const rows = json.rows ?? [];

  // Заменяем строки за период (идемпотентность повторных синков).
  await admin
    .from("seo_reports")
    .delete()
    .eq("integration_connection_id", connection.id)
    .gte("date", YMD(startDate))
    .lte("date", YMD(endDate));
  if (rows.length > 0) {
    const insertRows = rows.map((row) => ({
      organization_id: connection.organization_id,
      integration_connection_id: connection.id,
      date: row.keys?.[0] ?? YMD(endDate),
      clicks: Math.round(row.clicks ?? 0),
      impressions: Math.round(row.impressions ?? 0),
      ctr: row.ctr ?? 0,
      position: row.position ?? 0,
      dimension: "date",
      dimension_value: row.keys?.[0] ?? null,
    }));
    await admin.from("seo_reports").insert(insertRows);
  }

  await admin
    .from("integration_connections")
    .update({
      last_synced_at: new Date().toISOString(),
      status: "connected",
      error_message: null,
    })
    .eq("id", connection.id);
  return { ok: true, message: `Synced ${rows.length} day(s).` };
}

/**
 * Прогоняет синк по всем подключённым интеграциям организации(й).
 * GSC синкается реально; Google Ads / Meta Ads требуют дополнительной
 * настройки аккаунта (developer token / ad account) — для них синк помечается
 * как неуспешный с сообщением, без записи фиктивных данных.
 */
export async function runIntegrationsSync(): Promise<IntegrationsSyncSummary> {
  const admin = createAdminClient();
  const { data: connections } = await admin
    .from("integration_connections")
    .select("id, organization_id, provider")
    .eq("status", "connected");
  const list = connections ?? [];

  let synced = 0;
  let failed = 0;
  for (const connection of list) {
    const result =
      connection.provider === "gsc"
        ? await syncSearchConsole(admin, connection)
        : {
            ok: false,
            message: `${connection.provider}: scheduled sync requires account configuration.`,
          };
    if (result.ok) {
      synced += 1;
    } else {
      failed += 1;
      await admin
        .from("integration_connections")
        .update({ error_message: result.message.slice(0, 300) })
        .eq("id", connection.id);
    }
  }
  return { total: list.length, synced, failed };
}
