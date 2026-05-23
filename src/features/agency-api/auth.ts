import { createAdminClient } from "@/lib/supabase/server";

import { RATE_LIMIT_WINDOW_MS } from "./constants";
import { extractApiKey, hashApiKey } from "./keys";
import type { ApiAuthResult, ApiScopeKey } from "./types";

type Admin = ReturnType<typeof createAdminClient>;

/** Минута, к которой принадлежит время `t` (UTC). */
function currentMinuteStart(): Date {
  const now = Date.now();
  const truncated = Math.floor(now / RATE_LIMIT_WINDOW_MS) * RATE_LIMIT_WINDOW_MS;
  return new Date(truncated);
}

/** Извлекает IP клиента из заголовков (best-effort). */
function extractIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }
  return headers.get("x-real-ip");
}

/**
 * Проверяет ключ, scope и rate limit. При успехе пишет запись в
 * api_usage_logs и возвращает контекст. При неудаче возвращает
 * статус-код для HTTP-ответа.
 */
export async function requireApiAuth(
  request: Request,
  requiredScope: ApiScopeKey,
): Promise<ApiAuthResult> {
  const rawKey = extractApiKey(request.headers);
  if (!rawKey) {
    return {
      ok: false,
      status: 401,
      error: "Missing API key. Provide Authorization: Bearer <key>.",
    };
  }

  const admin = createAdminClient();
  const keyHash = hashApiKey(rawKey);
  const { data: keyRow, error } = await admin
    .from("api_keys")
    .select(
      "id, organization_id, agent_id, scopes, allowed_domains, rate_limit_per_minute, status",
    )
    .eq("key_hash", keyHash)
    .maybeSingle();
  if (error || !keyRow) {
    return { ok: false, status: 401, error: "Invalid API key." };
  }
  if (keyRow.status !== "active") {
    return { ok: false, status: 401, error: "API key revoked." };
  }
  if (!keyRow.scopes.includes(requiredScope)) {
    return {
      ok: false,
      status: 403,
      error: `Missing required scope: ${requiredScope}`,
    };
  }

  const allowedDomains = keyRow.allowed_domains;
  if (allowedDomains.length > 0) {
    const origin = request.headers.get("origin");
    const host = origin
      ? safeHostname(origin)
      : request.headers.get("host")?.split(":")[0] ?? null;
    if (!host || !allowedDomains.some((domain) => matchesDomain(host, domain))) {
      return {
        ok: false,
        status: 403,
        error: "Request origin not in allowed_domains.",
      };
    }
  }

  const path = pathFromRequest(request);
  const ip = extractIp(request.headers);
  const method = request.method;

  const rateLimit = await checkRateLimit(admin, keyRow.id, {
    organizationId: keyRow.organization_id,
    limit: keyRow.rate_limit_per_minute,
  });
  if (!rateLimit.ok) {
    await admin.from("api_usage_logs").insert({
      organization_id: keyRow.organization_id,
      api_key_id: keyRow.id,
      method,
      path,
      status: 429,
      ip,
    });
    return { ok: false, status: 429, error: "Rate limit exceeded." };
  }

  // Метим ключ как использованный (best-effort, ошибки не блокируют запрос).
  await admin
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", keyRow.id);

  return {
    ok: true,
    auth: {
      keyId: keyRow.id,
      organizationId: keyRow.organization_id,
      agentId: keyRow.agent_id,
      scopes: keyRow.scopes,
      allowedDomains,
    },
  };
}

/** Логирует успешный/неуспешный ответ API. */
export async function logApiUsage(
  request: Request,
  auth: { keyId: string; organizationId: string },
  status: number,
): Promise<void> {
  const admin = createAdminClient();
  await admin.from("api_usage_logs").insert({
    organization_id: auth.organizationId,
    api_key_id: auth.keyId,
    method: request.method,
    path: pathFromRequest(request),
    status,
    ip: extractIp(request.headers),
  });
}

/** Стандартные CORS-заголовки для разрешённого origin'а. */
export function corsHeadersFor(
  origin: string | null,
  allowedDomains: string[],
): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization,content-type,x-api-key",
    "Access-Control-Max-Age": "86400",
  };
  if (!origin) {
    return headers;
  }
  if (allowedDomains.length === 0) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Vary"] = "Origin";
    return headers;
  }
  const host = safeHostname(origin);
  if (host && allowedDomains.some((domain) => matchesDomain(host, domain))) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Vary"] = "Origin";
  }
  return headers;
}

/** Проверка/инкремент минутного окна. */
async function checkRateLimit(
  admin: Admin,
  apiKeyId: string,
  options: { organizationId: string; limit: number },
): Promise<{ ok: true } | { ok: false }> {
  const windowStart = currentMinuteStart().toISOString();
  const { data: existing } = await admin
    .from("api_rate_limits")
    .select("id, request_count")
    .eq("api_key_id", apiKeyId)
    .eq("window_start", windowStart)
    .maybeSingle();

  if (!existing) {
    await admin.from("api_rate_limits").insert({
      organization_id: options.organizationId,
      api_key_id: apiKeyId,
      window_start: windowStart,
      request_count: 1,
    });
    return { ok: true };
  }
  if (existing.request_count >= options.limit) {
    return { ok: false };
  }
  await admin
    .from("api_rate_limits")
    .update({ request_count: existing.request_count + 1 })
    .eq("id", existing.id);
  return { ok: true };
}

function pathFromRequest(request: Request): string {
  try {
    const url = new URL(request.url);
    return url.pathname + (url.search ? url.search : "");
  } catch {
    return "";
  }
}

function safeHostname(value: string): string | null {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** Точное совпадение либо wildcard вида *.example.com. */
function matchesDomain(host: string, pattern: string): boolean {
  const lower = pattern.trim().toLowerCase();
  if (!lower) {
    return false;
  }
  if (lower.startsWith("*.")) {
    const suffix = lower.slice(1); // ".example.com"
    return host.endsWith(suffix) || host === suffix.slice(1);
  }
  return host === lower;
}
