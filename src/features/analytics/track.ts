import { META_PIXEL_STANDARD } from "./constants";
import type { UtmPayload } from "./schema";

/**
 * Клиентский tracker: посылает события во внутренний API и пробрасывает
 * их в GA4, Meta Pixel и Google Ads conversion, если те доступны на
 * window. Все вызовы безопасны: если интеграция не настроена — событие
 * просто не отправляется во внешнюю систему.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    __krent_ads_id?: string;
    __krent_ads_labels?: Record<string, string>;
    dataLayer?: unknown[];
  }
}

const SESSION_COOKIE = "krent_session";
const SESSION_TTL_DAYS = 30;

function readCookie(name: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${name}=([^;]*)`),
  );
  const value = match?.[1];
  return value ? decodeURIComponent(value) : null;
}

function writeCookie(name: string, value: string, days: number): void {
  if (typeof document === "undefined") {
    return;
  }
  const maxAge = days * 86400;
  document.cookie =
    `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function getOrCreateSessionId(): string {
  const existing = readCookie(SESSION_COOKIE);
  if (existing && existing.length >= 8) {
    return existing;
  }
  const id = generateId();
  writeCookie(SESSION_COOKIE, id, SESSION_TTL_DAYS);
  return id;
}

function postInternal(body: Record<string, unknown>): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    void fetch("/api/analytics/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {
      // Сбой сети не должен ломать UI.
    });
  } catch {
    // ignore
  }
}

function callGtag(eventName: string, params: Record<string, unknown>): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }
  window.gtag("event", eventName, params);
}

function callFbq(eventType: string, params: Record<string, unknown>): void {
  if (typeof window === "undefined" || typeof window.fbq !== "function") {
    return;
  }
  const standard = META_PIXEL_STANDARD[eventType];
  if (standard) {
    window.fbq("track", standard, params);
  } else {
    window.fbq("trackCustom", eventType, params);
  }
}

function callConversion(eventType: string, params: Record<string, unknown>): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }
  const conversionId = window.__krent_ads_id;
  const labels = window.__krent_ads_labels;
  if (!conversionId || !labels) {
    return;
  }
  const label = labels[eventType];
  if (!label) {
    return;
  }
  window.gtag("event", "conversion", {
    send_to: `AW-${conversionId}/${label}`,
    ...params,
  });
}

export interface TrackOptions {
  entityType?: string;
  entityId?: string;
  data?: Record<string, unknown>;
}

/** Отправляет одно произвольное событие. */
export function track(eventType: string, options?: TrackOptions): void {
  if (typeof window === "undefined") {
    return;
  }
  const sessionId = getOrCreateSessionId();
  const path = window.location.pathname;
  const data = options?.data ?? {};
  postInternal({
    sessionId,
    eventType,
    path,
    entityType: options?.entityType ?? null,
    entityId: options?.entityId ?? null,
    payload: data,
    utm: null,
  });
  callGtag(eventType, { ...data, page_path: path });
  callFbq(eventType, data);
  callConversion(eventType, data);
}

/** Отправляет page_view + при необходимости фиксирует UTM-сессию. */
export function trackPageView(utm: UtmPayload | null): void {
  if (typeof window === "undefined") {
    return;
  }
  const sessionId = getOrCreateSessionId();
  const path = window.location.pathname;
  postInternal({
    sessionId,
    eventType: "page_view",
    path,
    entityType: null,
    entityId: null,
    payload: null,
    utm,
  });
  callGtag("page_view", { page_path: path });
  if (typeof window.fbq === "function") {
    window.fbq("track", "PageView");
  }
}
