import { createHmac } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

import type { WebhookEventType } from "./types";

const DELIVERY_TIMEOUT_MS = 7_000;

/** Расписание ретраев (мс от первоначальной попытки). */
export const RETRY_DELAYS_MS = [
  60_000, // 1 минута
  5 * 60_000, // 5 минут
  30 * 60_000, // 30 минут
  60 * 60_000, // 1 час
  6 * 60 * 60_000, // 6 часов
];

type Admin = ReturnType<typeof createAdminClient>;

interface DispatchInput {
  organizationId: string;
  eventType: WebhookEventType;
  entityType?: string | null;
  entityId?: string | null;
  payload: Record<string, unknown>;
}

/**
 * Кладёт событие в очередь и пытается доставить его. Каждая неуспешная
 * попытка обновляет `attempts` и `next_attempt_at`. Cron-job
 * (`/api/cron/webhooks-retry`) перезапускает событие по next_attempt_at.
 */
export async function dispatchWebhookEvent(input: DispatchInput): Promise<void> {
  const admin = createAdminClient();
  const payload = input.payload as unknown as Json;

  const { data: event, error: insertError } = await admin
    .from("webhook_events")
    .insert({
      organization_id: input.organizationId,
      event_type: input.eventType,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      payload,
      status: "pending",
      attempts: 0,
    })
    .select("id")
    .single();
  if (insertError || !event) {
    return;
  }
  await tryDeliverEvent(admin, event.id);
}

/**
 * Cron-обработчик: подбирает события со status='pending' и
 * next_attempt_at в прошлом, заново вызывает доставку.
 */
export async function runWebhookRetryBatch(limit = 25): Promise<{
  processed: number;
}> {
  const admin = createAdminClient();
  // Атомарный захват пачки (FOR UPDATE SKIP LOCKED + бронь next_attempt_at):
  // параллельные прогоны не доставят одно событие дважды.
  const { data: claimed } = await admin.rpc("claim_due_webhook_events", {
    p_limit: limit,
  });
  const ids = claimed ?? [];
  if (ids.length === 0) {
    return { processed: 0 };
  }
  for (const id of ids) {
    await tryDeliverEvent(admin, id);
  }
  return { processed: ids.length };
}

interface EventForDelivery {
  id: string;
  organization_id: string;
  event_type: string;
  entity_type: string | null;
  entity_id: string | null;
  payload: Json;
  attempts: number;
}

async function tryDeliverEvent(admin: Admin, eventId: string): Promise<void> {
  const { data: event } = await admin
    .from("webhook_events")
    .select(
      "id, organization_id, event_type, entity_type, entity_id, payload, attempts",
    )
    .eq("id", eventId)
    .maybeSingle();
  if (!event) {
    return;
  }
  const e = event as EventForDelivery;

  const { data: endpoints } = await admin
    .from("webhook_endpoints")
    .select(
      "id, url, secret, previous_secret, secret_rotated_at, event_types, is_active",
    )
    .eq("organization_id", e.organization_id)
    .eq("is_active", true);
  const targets = (endpoints ?? []).filter((endpoint) => {
    if (endpoint.event_types.length === 0) return true;
    return endpoint.event_types.includes(e.event_type);
  });

  if (targets.length === 0) {
    await admin
      .from("webhook_events")
      .update({
        status: "delivered",
        processed_at: new Date().toISOString(),
        next_attempt_at: null,
      })
      .eq("id", e.id);
    return;
  }

  const body = JSON.stringify({
    id: e.id,
    type: e.event_type,
    organization_id: e.organization_id,
    entity_type: e.entity_type,
    entity_id: e.entity_id,
    occurred_at: new Date().toISOString(),
    payload: e.payload,
  });

  const attemptNumber = e.attempts + 1;
  let anySuccess = false;
  const errors: string[] = [];
  for (const endpoint of targets) {
    const result = await deliverOnce(admin, {
      endpointId: endpoint.id,
      url: endpoint.url,
      secret: endpoint.secret,
      previousSecret: endpoint.previous_secret,
      organizationId: e.organization_id,
      eventId: e.id,
      eventType: e.event_type,
      body,
      attempt: attemptNumber,
    });
    if (result.ok) {
      anySuccess = true;
    } else {
      errors.push(`${endpoint.url}: ${result.message}`);
    }
  }

  if (anySuccess && errors.length === 0) {
    await admin
      .from("webhook_events")
      .update({
        status: "delivered",
        attempts: attemptNumber,
        processed_at: new Date().toISOString(),
        next_attempt_at: null,
        last_error: null,
      })
      .eq("id", e.id);
    return;
  }

  if (attemptNumber >= RETRY_DELAYS_MS.length) {
    await admin
      .from("webhook_events")
      .update({
        status: "failed",
        attempts: attemptNumber,
        processed_at: new Date().toISOString(),
        next_attempt_at: null,
        last_error: errors.join("; ") || "delivery failed",
      })
      .eq("id", e.id);
    return;
  }

  const delay = RETRY_DELAYS_MS[attemptNumber - 1] ?? 60_000;
  const next = new Date(Date.now() + delay).toISOString();
  await admin
    .from("webhook_events")
    .update({
      status: "pending",
      attempts: attemptNumber,
      next_attempt_at: next,
      last_error: errors.join("; ") || null,
    })
    .eq("id", e.id);
}

interface DeliveryOptions {
  endpointId: string;
  url: string;
  secret: string | null;
  previousSecret: string | null;
  organizationId: string;
  eventId: string;
  eventType: string;
  body: string;
  attempt: number;
}

async function deliverOnce(
  admin: Admin,
  options: DeliveryOptions,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-krent-event-id": options.eventId,
    "x-krent-event-type": options.eventType,
    "x-krent-attempt": String(options.attempt),
  };
  if (options.secret) {
    const signature = createHmac("sha256", options.secret)
      .update(options.body, "utf8")
      .digest("base64");
    headers["x-krent-signature"] = signature;
    if (options.previousSecret) {
      const prevSignature = createHmac("sha256", options.previousSecret)
        .update(options.body, "utf8")
        .digest("base64");
      headers["x-krent-previous-signature"] = prevSignature;
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);
  let responseCode: number | null = null;
  let responseBody: string | null = null;
  let ok = false;
  let message = "";
  try {
    const response = await fetch(options.url, {
      method: "POST",
      headers,
      body: options.body,
      signal: controller.signal,
    });
    responseCode = response.status;
    const text = await response.text();
    responseBody = text.length > 2_000 ? text.slice(0, 2_000) : text;
    ok = response.status >= 200 && response.status < 300;
    if (!ok) {
      message = `HTTP ${response.status}`;
    }
  } catch (error) {
    responseBody = error instanceof Error ? error.message : String(error);
    message = responseBody;
  } finally {
    clearTimeout(timer);
  }

  await admin.from("webhook_delivery_logs").insert({
    organization_id: options.organizationId,
    webhook_event_id: options.eventId,
    webhook_endpoint_id: options.endpointId,
    attempt: options.attempt,
    status: ok ? "success" : "failed",
    response_code: responseCode,
    response_body: responseBody,
  });

  const now = new Date().toISOString();
  await admin
    .from("webhook_endpoints")
    .update(ok ? { last_success_at: now } : { last_failure_at: now })
    .eq("id", options.endpointId);

  return ok ? { ok: true } : { ok: false, message };
}

/**
 * Ротация webhook-секрета: текущий секрет переезжает в previous_secret
 * (грейс-период для подписей), новый секрет становится primary. Сторонние
 * получатели должны сверять обе подписи на время transition.
 */
export async function rotateWebhookSecret(
  organizationId: string,
  endpointId: string,
  newSecret: string,
): Promise<{ ok: boolean }> {
  const admin = createAdminClient();
  const { data: endpoint } = await admin
    .from("webhook_endpoints")
    .select("secret")
    .eq("id", endpointId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (!endpoint) return { ok: false };
  await admin
    .from("webhook_endpoints")
    .update({
      previous_secret: endpoint.secret,
      secret: newSecret,
      secret_rotated_at: new Date().toISOString(),
    })
    .eq("id", endpointId);
  return { ok: true };
}
