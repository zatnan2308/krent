import { getIntegrationAdapter } from "@/features/integrations/adapters";
import { createAdminClient } from "@/lib/supabase/server";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Ставит оффлайн-конверсию «deal_closed» при закрытии сделки. Идемпотентно
 * (unique по deal_id+conversion_type). Click id берётся из атрибуции лида;
 * без него строка помечается 'skipped' (нечего атрибутировать).
 */
export async function enqueueDealConversion(
  admin: Admin,
  organizationId: string,
  dealId: string,
): Promise<void> {
  const { data: deal } = await admin
    .from("deals")
    .select("id, amount, currency, contact_id, lead_id")
    .eq("id", dealId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (!deal) {
    return;
  }

  let clickSource: string | null = null;
  let clickId: string | null = null;
  if (deal.lead_id) {
    const { data: attribution } = await admin
      .from("lead_attribution")
      .select("gclid, fbclid")
      .eq("lead_id", deal.lead_id)
      .maybeSingle();
    if (attribution?.gclid) {
      clickSource = "gclid";
      clickId = attribution.gclid;
    } else if (attribution?.fbclid) {
      clickSource = "fbclid";
      clickId = attribution.fbclid;
    }
  }

  await admin.from("offline_conversions").upsert(
    {
      organization_id: organizationId,
      deal_id: deal.id,
      lead_id: deal.lead_id,
      contact_id: deal.contact_id,
      conversion_type: "deal_closed",
      click_source: clickSource,
      click_id: clickId,
      value: deal.amount,
      currency: deal.currency,
      status: clickId ? "pending" : "skipped",
    },
    { onConflict: "deal_id,conversion_type", ignoreDuplicates: true },
  );
}

/** Итог обработки очереди оффлайн-конверсий. */
export interface OfflineConversionsResult {
  processed: number;
  uploaded: number;
  failed: number;
}

/**
 * Обрабатывает pending-конверсии: подбирает провайдера по типу click id
 * (gclid → Google Ads, fbclid → Meta) и вызывает provider-адаптер. Реальная
 * выгрузка активируется, когда у адаптера есть креды/конфиг аккаунта; до тех
 * пор строки честно помечаются 'failed' с сообщением (без фиктивного успеха).
 */
export async function processPendingOfflineConversions(
  limit = 100,
): Promise<OfflineConversionsResult> {
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("offline_conversions")
    .select("*")
    .eq("status", "pending")
    .limit(limit);
  const list = rows ?? [];

  let uploaded = 0;
  let failed = 0;
  for (const row of list) {
    const provider =
      row.click_source === "fbclid" ? "meta_ads" : "google_ads";
    const { data: connection } = await admin
      .from("integration_connections")
      .select("id")
      .eq("organization_id", row.organization_id)
      .eq("provider", provider)
      .eq("status", "connected")
      .maybeSingle();
    const adapter = getIntegrationAdapter(provider);
    const result = await adapter.uploadOfflineConversion(connection?.id ?? "", {
      type: row.conversion_type,
      externalId: row.click_id ?? "",
      occurredAt: row.occurred_at,
      value: row.value ?? undefined,
      currency: row.currency ?? undefined,
    });
    await admin
      .from("offline_conversions")
      .update({
        status: result.ok ? "uploaded" : "failed",
        error_message: result.ok ? null : result.message.slice(0, 300),
      })
      .eq("id", row.id);
    if (result.ok) {
      uploaded += 1;
    } else {
      failed += 1;
    }
  }
  return { processed: list.length, uploaded, failed };
}
