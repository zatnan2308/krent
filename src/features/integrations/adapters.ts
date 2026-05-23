import { getServerEnv } from "@/lib/env";

import type { IntegrationProvider } from "./types";

/**
 * Stub-адаптеры провайдеров (GSC / Google Ads / Meta Ads).
 *
 * Дизайн:
 *  - адаптер сам сообщает, готов ли он к работе (`getStatus`); UI
 *    показывает «Requires API credentials», если provider не настроен;
 *  - sync и offline-conversion реализуются здесь, под единый
 *    интерфейс, чтобы вызывающий код не зависел от конкретного SDK;
 *  - реальные API-вызовы подключаются в этих же файлах, как только
 *    клиент даёт OAuth-credentials.
 */

export interface SyncResult {
  ok: boolean;
  message: string;
}

export interface OfflineConversionPayload {
  type: string;
  externalId: string;
  occurredAt: string;
  value?: number;
  currency?: string;
}

export interface AdapterStatus {
  ready: boolean;
  reason: string;
}

export interface IntegrationAdapter {
  readonly provider: IntegrationProvider;
  getStatus(): AdapterStatus;
  getAuthorizationUrl(state: string): string | null;
  exchangeCode(code: string): Promise<{
    accessToken: string;
    refreshToken: string | null;
    expiresAt: string | null;
  } | null>;
  syncReports(connectionId: string): Promise<SyncResult>;
  uploadOfflineConversion(
    connectionId: string,
    payload: OfflineConversionPayload,
  ): Promise<SyncResult>;
}

const GOOGLE_SCOPES: Record<"gsc" | "google_ads", string[]> = {
  gsc: ["https://www.googleapis.com/auth/webmasters.readonly"],
  google_ads: ["https://www.googleapis.com/auth/adwords"],
};

const META_SCOPES = ["ads_read", "ads_management"];

function getGoogleConfig(): {
  clientId: string;
  clientSecret: string;
  redirectUrl: string;
} | null {
  const env = getServerEnv();
  if (
    !env.GOOGLE_OAUTH_CLIENT_ID ||
    !env.GOOGLE_OAUTH_CLIENT_SECRET ||
    !env.GOOGLE_OAUTH_REDIRECT_URL
  ) {
    return null;
  }
  return {
    clientId: env.GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: env.GOOGLE_OAUTH_CLIENT_SECRET,
    redirectUrl: env.GOOGLE_OAUTH_REDIRECT_URL,
  };
}

function getMetaConfig(): {
  appId: string;
  appSecret: string;
  redirectUrl: string;
} | null {
  const env = getServerEnv();
  if (
    !env.META_APP_ID ||
    !env.META_APP_SECRET ||
    !env.META_OAUTH_REDIRECT_URL
  ) {
    return null;
  }
  return {
    appId: env.META_APP_ID,
    appSecret: env.META_APP_SECRET,
    redirectUrl: env.META_OAUTH_REDIRECT_URL,
  };
}

function googleAuthUrl(scopes: string[], state: string): string | null {
  const config = getGoogleConfig();
  if (!config) {
    return null;
  }
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scopes.join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);
  return url.toString();
}

async function googleExchangeCode(
  code: string,
): Promise<{
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
} | null> {
  const config = getGoogleConfig();
  if (!config) {
    return null;
  }
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: config.redirectUrl,
      }).toString(),
    });
    if (!response.ok) {
      return null;
    }
    const json = (await response.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };
    if (!json.access_token) {
      return null;
    }
    const expiresAt = json.expires_in
      ? new Date(Date.now() + json.expires_in * 1000).toISOString()
      : null;
    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token ?? null,
      expiresAt,
    };
  } catch {
    return null;
  }
}

function metaAuthUrl(state: string): string | null {
  const config = getMetaConfig();
  if (!config) {
    return null;
  }
  const url = new URL("https://www.facebook.com/v18.0/dialog/oauth");
  url.searchParams.set("client_id", config.appId);
  url.searchParams.set("redirect_uri", config.redirectUrl);
  url.searchParams.set("scope", META_SCOPES.join(","));
  url.searchParams.set("state", state);
  return url.toString();
}

async function metaExchangeCode(code: string): Promise<{
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
} | null> {
  const config = getMetaConfig();
  if (!config) {
    return null;
  }
  try {
    const url = new URL(
      "https://graph.facebook.com/v18.0/oauth/access_token",
    );
    url.searchParams.set("client_id", config.appId);
    url.searchParams.set("client_secret", config.appSecret);
    url.searchParams.set("redirect_uri", config.redirectUrl);
    url.searchParams.set("code", code);
    const response = await fetch(url.toString());
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
    return {
      accessToken: json.access_token,
      refreshToken: null,
      expiresAt,
    };
  } catch {
    return null;
  }
}

function googleAdapter(
  provider: "gsc" | "google_ads",
): IntegrationAdapter {
  const config = getGoogleConfig();
  return {
    provider,
    getStatus() {
      return config
        ? { ready: true, reason: "OAuth configured." }
        : {
            ready: false,
            reason:
              "Requires API credentials (GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET / GOOGLE_OAUTH_REDIRECT_URL).",
          };
    },
    getAuthorizationUrl(state) {
      return googleAuthUrl(GOOGLE_SCOPES[provider], state);
    },
    async exchangeCode(code) {
      return googleExchangeCode(code);
    },
    async syncReports() {
      // Реальный sync вызывает соответствующее Google API. Здесь только
      // honest no-op, пока daily-sync cron не подключён к подписанному
      // токену конкретной организации.
      if (!config) {
        return {
          ok: false,
          message: `${provider}: requires API credentials before the first sync.`,
        };
      }
      return {
        ok: false,
        message: `${provider}: scheduled sync runs on the next cron iteration.`,
      };
    },
    async uploadOfflineConversion(_connectionId, payload) {
      if (!config) {
        return {
          ok: false,
          message: `${provider}: cannot upload offline conversion '${payload.type}' without API credentials.`,
        };
      }
      return {
        ok: false,
        message: `${provider}: offline conversion '${payload.type}' is queued for the next sync window.`,
      };
    },
  };
}

function metaAdapter(): IntegrationAdapter {
  const config = getMetaConfig();
  return {
    provider: "meta_ads",
    getStatus() {
      return config
        ? { ready: true, reason: "OAuth configured." }
        : {
            ready: false,
            reason:
              "Requires API credentials (META_APP_ID / META_APP_SECRET / META_OAUTH_REDIRECT_URL).",
          };
    },
    getAuthorizationUrl(state) {
      return metaAuthUrl(state);
    },
    async exchangeCode(code) {
      return metaExchangeCode(code);
    },
    async syncReports() {
      if (!config) {
        return {
          ok: false,
          message:
            "meta_ads: requires API credentials before the first sync.",
        };
      }
      return {
        ok: false,
        message:
          "meta_ads: scheduled sync runs on the next cron iteration.",
      };
    },
    async uploadOfflineConversion(_connectionId, payload) {
      if (!config) {
        return {
          ok: false,
          message: `meta_ads: cannot upload offline conversion '${payload.type}' without API credentials.`,
        };
      }
      return {
        ok: false,
        message: `meta_ads: offline conversion '${payload.type}' is queued for the next sync window.`,
      };
    },
  };
}

export function getIntegrationAdapter(
  provider: IntegrationProvider,
): IntegrationAdapter {
  switch (provider) {
    case "gsc":
    case "google_ads":
      return googleAdapter(provider);
    case "meta_ads":
      return metaAdapter();
    default:
      return metaAdapter();
  }
}
