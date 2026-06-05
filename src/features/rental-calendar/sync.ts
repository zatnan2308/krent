import { createAdminClient } from "@/lib/supabase/server";

import { PROVIDER_EVENT_SOURCE } from "./constants";
import { parseCalendar, type ParsedIcalEvent } from "./ical";

export interface SyncResult {
  ok: boolean;
  imported: number;
  error?: string;
}

/**
 * Синхронизирует один источник iCal: загружает фид, парсит события и
 * полностью заменяет события этого источника (внешний календарь —
 * источник истины). Пишет лог синхронизации в ical_sync_logs.
 */
export async function runIcalSync(sourceId: string): Promise<SyncResult> {
  const admin = createAdminClient();

  const { data: source } = await admin
    .from("ical_import_sources")
    .select("*")
    .eq("id", sourceId)
    .maybeSingle();
  if (!source) {
    return { ok: false, imported: 0, error: "Import source not found." };
  }

  const { data: calendar } = await admin
    .from("rental_calendars")
    .select("property_id")
    .eq("id", source.calendar_id)
    .maybeSingle();
  if (!calendar) {
    return { ok: false, imported: 0, error: "Calendar not found." };
  }

  let parsed: ParsedIcalEvent[];
  try {
    const response = await fetch(source.url, {
      headers: { "User-Agent": "Krent-Calendar-Sync" },
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`Feed responded with HTTP ${response.status}`);
    }
    parsed = parseCalendar(await response.text());
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not fetch the feed.";
    await admin.from("ical_sync_logs").insert({
      organization_id: source.organization_id,
      import_source_id: source.id,
      status: "error",
      events_imported: 0,
      message,
    });
    return { ok: false, imported: 0, error: message };
  }

  // Дедуп по UID, отсев некорректных диапазонов.
  const byUid = new Map<string, ParsedIcalEvent>();
  for (const event of parsed) {
    if (event.endDate > event.startDate) {
      byUid.set(event.uid, event);
    }
  }
  const events = [...byUid.values()];
  const eventSource = PROVIDER_EVENT_SOURCE[source.provider];

  // Отражаем внешний календарь как есть, но БЕЗ окна delete-then-insert
  // (раньше при сбое insert даты источника пропадали до след. синка — риск
  // овербукинга). Сначала upsert текущих событий по (import_source_id,
  // external_uid), затем удаляем только те строки источника, которых уже нет
  // во внешнем фиде (по id — UUID безопасны в .in()).
  if (events.length > 0) {
    const { error: upsertError } = await admin
      .from("rental_calendar_events")
      .upsert(
        events.map((event) => ({
          organization_id: source.organization_id,
          calendar_id: source.calendar_id,
          property_id: calendar.property_id,
          import_source_id: source.id,
          source: eventSource,
          status: "booked" as const,
          start_date: event.startDate,
          end_date: event.endDate,
          title: event.summary,
          external_uid: event.uid,
        })),
        { onConflict: "import_source_id,external_uid" },
      );
    if (upsertError) {
      await admin.from("ical_sync_logs").insert({
        organization_id: source.organization_id,
        import_source_id: source.id,
        status: "error",
        events_imported: 0,
        message: "Could not save imported events.",
      });
      return { ok: false, imported: 0, error: "Could not save events." };
    }
  }

  // Снятие устаревших (исчезнувших из фида) событий источника.
  const keepUids = new Set(events.map((event) => event.uid));
  const { data: existingRows } = await admin
    .from("rental_calendar_events")
    .select("id, external_uid")
    .eq("import_source_id", source.id);
  const staleIds = (existingRows ?? [])
    .filter((row) => !row.external_uid || !keepUids.has(row.external_uid))
    .map((row) => row.id);
  if (staleIds.length > 0) {
    await admin.from("rental_calendar_events").delete().in("id", staleIds);
  }

  await admin
    .from("ical_import_sources")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", source.id);
  await admin.from("ical_sync_logs").insert({
    organization_id: source.organization_id,
    import_source_id: source.id,
    status: "success",
    events_imported: events.length,
    message: null,
  });

  return { ok: true, imported: events.length };
}
