import type { AttributionInput } from "./schema";

const STORAGE_KEY = "krent_attribution";
const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

const EMPTY_ATTRIBUTION: AttributionInput = {
  utmSource: null,
  utmMedium: null,
  utmCampaign: null,
  utmContent: null,
  utmTerm: null,
  gclid: null,
  gbraid: null,
  wbraid: null,
  fbclid: null,
  fbc: null,
  fbp: null,
  landingPage: null,
  firstPage: null,
  lastPage: null,
  referrer: null,
};

interface StoredAttribution extends AttributionInput {
  capturedAt: number;
}

/** Читает значение cookie по имени (клиентская сторона). */
function readCookie(name: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${escaped}=([^;]*)`),
  );
  return match && match[1] ? decodeURIComponent(match[1]) : null;
}

/** Загружает сохранённую атрибуцию, если она не устарела. */
function loadStored(): StoredAttribution | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as StoredAttribution;
    if (
      typeof parsed.capturedAt !== "number" ||
      Date.now() - parsed.capturedAt > MAX_AGE_MS
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Фиксирует UTM/click-данные при загрузке страницы.
 * Модель first-touch: каждое поле сохраняется при первом появлении,
 * last_page обновляется на каждой странице.
 */
export function captureAttribution(currentUrl: string): void {
  if (typeof window === "undefined") {
    return;
  }
  let url: URL;
  try {
    url = new URL(currentUrl);
  } catch {
    return;
  }
  const params = url.searchParams;
  const stored = loadStored();
  const base: StoredAttribution = stored ?? {
    ...EMPTY_ATTRIBUTION,
    capturedAt: Date.now(),
  };
  const keep = (current: string | null, incoming: string | null): string | null =>
    current ?? incoming;
  const fbclid = params.get("fbclid");

  const next: StoredAttribution = {
    capturedAt: base.capturedAt,
    utmSource: keep(base.utmSource, params.get("utm_source")),
    utmMedium: keep(base.utmMedium, params.get("utm_medium")),
    utmCampaign: keep(base.utmCampaign, params.get("utm_campaign")),
    utmContent: keep(base.utmContent, params.get("utm_content")),
    utmTerm: keep(base.utmTerm, params.get("utm_term")),
    gclid: keep(base.gclid, params.get("gclid")),
    gbraid: keep(base.gbraid, params.get("gbraid")),
    wbraid: keep(base.wbraid, params.get("wbraid")),
    fbclid: keep(base.fbclid, fbclid),
    fbp: keep(base.fbp, readCookie("_fbp")),
    fbc: keep(
      base.fbc,
      readCookie("_fbc") ??
        (fbclid ? `fb.1.${Date.now()}.${fbclid}` : null),
    ),
    landingPage: base.landingPage ?? currentUrl,
    firstPage: base.firstPage ?? url.pathname,
    lastPage: url.pathname,
    referrer: base.referrer ?? (document.referrer || null),
  };

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage недоступен — атрибуция не критична для работы сайта.
  }
}

/** Возвращает сохранённую атрибуцию для отправки вместе с формой. */
export function readAttribution(): AttributionInput {
  if (typeof window === "undefined") {
    return { ...EMPTY_ATTRIBUTION };
  }
  const stored = loadStored();
  if (!stored) {
    return { ...EMPTY_ATTRIBUTION };
  }
  return {
    utmSource: stored.utmSource,
    utmMedium: stored.utmMedium,
    utmCampaign: stored.utmCampaign,
    utmContent: stored.utmContent,
    utmTerm: stored.utmTerm,
    gclid: stored.gclid,
    gbraid: stored.gbraid,
    wbraid: stored.wbraid,
    fbclid: stored.fbclid,
    fbc: stored.fbc,
    fbp: stored.fbp,
    landingPage: stored.landingPage,
    firstPage: stored.firstPage,
    lastPage: stored.lastPage,
    referrer: stored.referrer,
  };
}
