import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { ingestEventSchema } from "@/features/analytics/schema";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/server/auth";
import { resolvePublicOrganization } from "@/server/public-site";
import type { Json } from "@/types/database";

export const dynamic = "force-dynamic";

/** Тип устройства по User-Agent (как в submitLead). */
function detectDevice(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (!ua) {
    return "unknown";
  }
  if (
    /ipad|tablet|playbook|silk/.test(ua) ||
    (/android/.test(ua) && !/mobile/.test(ua))
  ) {
    return "tablet";
  }
  if (/mobi|iphone|ipod|windows phone/.test(ua)) {
    return "mobile";
  }
  return "desktop";
}

/**
 * Приём одного события клиентского трекера. Резолвит организацию по
 * домену запроса (multi-tenant), обновляет analytics_sessions,
 * фиксирует UTM-touchpoint при наличии, пишет analytics_events.
 * Если организация не найдена — отвечает 200, чтобы не ломать UI.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const parsed = ingestEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const data = parsed.data;

  const organization = await resolvePublicOrganization();
  if (!organization) {
    return NextResponse.json({ ok: true });
  }

  const admin = createAdminClient();
  const requestHeaders = headers();
  const ua = requestHeaders.get("user-agent") ?? "";
  const country = requestHeaders.get("x-vercel-ip-country");
  const city = requestHeaders.get("x-vercel-ip-city");
  const device = detectDevice(ua);

  let userId: string | null = null;
  try {
    const user = await getCurrentUser();
    userId = user?.id ?? null;
  } catch {
    userId = null;
  }

  // ---- Сессия: создаём при первом событии, иначе обновляем ----
  const isPageView = data.eventType === "page_view";
  const { data: existingSession } = await admin
    .from("analytics_sessions")
    .select("id, page_view_count")
    .eq("organization_id", organization.id)
    .eq("session_id", data.sessionId)
    .maybeSingle();
  if (existingSession) {
    await admin
      .from("analytics_sessions")
      .update({
        last_seen_at: new Date().toISOString(),
        last_landing_page: data.path,
        page_view_count:
          existingSession.page_view_count + (isPageView ? 1 : 0),
      })
      .eq("id", existingSession.id);
  } else {
    await admin.from("analytics_sessions").insert({
      organization_id: organization.id,
      session_id: data.sessionId,
      user_agent: ua,
      device,
      country,
      city,
      first_landing_page: data.utm?.landing_page ?? data.path,
      last_landing_page: data.path,
      referrer: data.utm?.referrer ?? requestHeaders.get("referer"),
      page_view_count: isPageView ? 1 : 0,
    });
  }

  // ---- UTM touchpoint: одна строка на каждый landing с UTM ----
  if (data.utm) {
    await admin.from("utm_sessions").insert({
      organization_id: organization.id,
      session_id: data.sessionId,
      utm_source: data.utm.utm_source,
      utm_medium: data.utm.utm_medium,
      utm_campaign: data.utm.utm_campaign,
      utm_content: data.utm.utm_content,
      utm_term: data.utm.utm_term,
      gclid: data.utm.gclid,
      gbraid: data.utm.gbraid,
      wbraid: data.utm.wbraid,
      fbclid: data.utm.fbclid,
      fbc: data.utm.fbc,
      fbp: data.utm.fbp,
      landing_page: data.utm.landing_page,
      referrer: data.utm.referrer,
    });
  }

  // ---- Само событие -----------------------------------------
  await admin.from("analytics_events").insert({
    organization_id: organization.id,
    session_id: data.sessionId,
    user_id: userId,
    event_type: data.eventType,
    entity_type: data.entityType,
    entity_id: data.entityId,
    path: data.path,
    payload: (data.payload ?? {}) as Json,
  });

  return NextResponse.json({ ok: true });
}
