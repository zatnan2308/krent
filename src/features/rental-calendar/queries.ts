import { createClient } from "@/lib/supabase/server";

import type {
  IcalImportSource,
  IcalSyncStatus,
  RentalAvailabilityRule,
  RentalCalendar,
  RentalCalendarEvent,
  RentalPriceRule,
} from "./types";

/** Генерирует токен фида экспорта календаря. */
export function generateFeedToken(): string {
  return (
    crypto.randomUUID().replace(/-/g, "") +
    crypto.randomUUID().replace(/-/g, "")
  );
}

/** Находит календарь объекта; при отсутствии создаёт его с дефолтами. */
export async function getOrCreateCalendar(
  propertyId: string,
  organizationId: string,
): Promise<RentalCalendar | null> {
  const supabase = createClient();
  const { data: existing } = await supabase
    .from("rental_calendars")
    .select("*")
    .eq("property_id", propertyId)
    .maybeSingle();
  if (existing) {
    return existing;
  }

  const { data: created, error } = await supabase
    .from("rental_calendars")
    .insert({ organization_id: organizationId, property_id: propertyId })
    .select("*")
    .single();
  if (error || !created) {
    // Возможна гонка по unique(property_id) — пробуем найти снова.
    const { data: retry } = await supabase
      .from("rental_calendars")
      .select("*")
      .eq("property_id", propertyId)
      .maybeSingle();
    return retry;
  }

  // Дефолтное правило доступности и токен экспорта.
  await supabase.from("rental_availability_rules").insert({
    organization_id: organizationId,
    calendar_id: created.id,
  });
  await supabase.from("ical_export_tokens").insert({
    organization_id: organizationId,
    calendar_id: created.id,
    token: generateFeedToken(),
  });
  return created;
}

export interface SyncLogView {
  id: string;
  sourceName: string;
  status: IcalSyncStatus;
  eventsImported: number;
  message: string | null;
  createdAt: string;
}

export interface CalendarData {
  events: RentalCalendarEvent[];
  availabilityRule: RentalAvailabilityRule | null;
  priceRules: RentalPriceRule[];
  importSources: IcalImportSource[];
  syncLogs: SyncLogView[];
  exportToken: string | null;
}

/** Загружает все данные календаря объекта для UI. */
export async function getCalendarData(
  calendarId: string,
): Promise<CalendarData> {
  const supabase = createClient();
  const [eventsResult, ruleResult, priceResult, sourcesResult, tokenResult] =
    await Promise.all([
      supabase
        .from("rental_calendar_events")
        .select("*")
        .eq("calendar_id", calendarId)
        .order("start_date", { ascending: true }),
      supabase
        .from("rental_availability_rules")
        .select("*")
        .eq("calendar_id", calendarId)
        .maybeSingle(),
      supabase
        .from("rental_price_rules")
        .select("*")
        .eq("calendar_id", calendarId)
        .order("start_date", { ascending: true }),
      supabase
        .from("ical_import_sources")
        .select("*")
        .eq("calendar_id", calendarId)
        .order("created_at", { ascending: true }),
      supabase
        .from("ical_export_tokens")
        .select("token")
        .eq("calendar_id", calendarId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const importSources = sourcesResult.data ?? [];
  let syncLogs: SyncLogView[] = [];
  if (importSources.length > 0) {
    const { data: logs } = await supabase
      .from("ical_sync_logs")
      .select("*")
      .in(
        "import_source_id",
        importSources.map((source) => source.id),
      )
      .order("created_at", { ascending: false })
      .limit(20);
    syncLogs = (logs ?? []).map((log) => ({
      id: log.id,
      sourceName:
        importSources.find((source) => source.id === log.import_source_id)
          ?.name ?? "Source",
      status: log.status,
      eventsImported: log.events_imported,
      message: log.message,
      createdAt: log.created_at,
    }));
  }

  return {
    events: eventsResult.data ?? [],
    availabilityRule: ruleResult.data,
    priceRules: priceResult.data ?? [],
    importSources,
    syncLogs,
    exportToken: tokenResult.data?.token ?? null,
  };
}
