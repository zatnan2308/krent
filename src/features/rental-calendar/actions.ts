"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

import { findConflicts } from "./availability";
import { BLOCK_EVENT_SOURCE } from "./constants";
import { generateFeedToken, getOrCreateCalendar } from "./queries";
import {
  availabilityRuleSchema,
  createCalendarEventSchema,
  importSourceSchema,
  priceRuleSchema,
  type ActionResult,
  type AvailabilityRuleInput,
  type CreateCalendarEventInput,
  type ImportSourceInput,
  type PriceRuleInput,
} from "./schema";
import { runIcalSync } from "./sync";

function calendarPath(propertyId: string): string {
  return `/dashboard/properties/${propertyId}/calendar`;
}

/** Гард: активная организация + право properties.update. */
async function requireCalendarAccess(): Promise<
  { ok: true; organizationId: string } | { ok: false; error: string }
> {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return { ok: false, error: "No active organization." };
  }
  if (!hasPermission(context, "properties.update")) {
    return {
      ok: false,
      error: "You do not have permission to manage calendars.",
    };
  }
  return { ok: true, organizationId: context.organization.id };
}

/** Создаёт ручную блокировку дат (block / maintenance / cleaning). */
export async function createCalendarEvent(
  input: CreateCalendarEventInput,
): Promise<ActionResult> {
  const parsed = createCalendarEventSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid block data.",
    };
  }
  const access = await requireCalendarAccess();
  if (!access.ok) {
    return access;
  }

  const data = parsed.data;
  const supabase = createClient();
  const { data: property } = await supabase
    .from("properties")
    .select("id")
    .eq("id", data.propertyId)
    .eq("organization_id", access.organizationId)
    .maybeSingle();
  if (!property) {
    return { ok: false, error: "Property not found." };
  }

  const calendar = await getOrCreateCalendar(
    data.propertyId,
    access.organizationId,
  );
  if (!calendar) {
    return { ok: false, error: "Could not load the calendar." };
  }

  // Защита от double booking: пересечение с занятыми датами.
  const { data: existingEvents } = await supabase
    .from("rental_calendar_events")
    .select("id, status, start_date, end_date")
    .eq("property_id", data.propertyId);
  if (findConflicts(existingEvents ?? [], data.startDate, data.endDate).length > 0) {
    return {
      ok: false,
      error: "These dates overlap an existing booking or block.",
    };
  }

  const { error } = await supabase.from("rental_calendar_events").insert({
    organization_id: access.organizationId,
    calendar_id: calendar.id,
    property_id: data.propertyId,
    source: BLOCK_EVENT_SOURCE[data.status],
    status: data.status,
    start_date: data.startDate,
    end_date: data.endDate,
    title: data.title,
  });
  if (error) {
    return { ok: false, error: "Could not create the calendar block." };
  }

  revalidatePath(calendarPath(data.propertyId));
  return { ok: true };
}

/** Удаляет событие календаря. */
export async function deleteCalendarEvent(
  eventId: string,
): Promise<ActionResult> {
  const access = await requireCalendarAccess();
  if (!access.ok) {
    return access;
  }
  const supabase = createClient();
  const { data: event } = await supabase
    .from("rental_calendar_events")
    .select("property_id")
    .eq("id", eventId)
    .eq("organization_id", access.organizationId)
    .maybeSingle();
  if (!event) {
    return { ok: false, error: "Event not found." };
  }
  const { error } = await supabase
    .from("rental_calendar_events")
    .delete()
    .eq("id", eventId)
    .eq("organization_id", access.organizationId);
  if (error) {
    return { ok: false, error: "Could not delete the event." };
  }
  revalidatePath(calendarPath(event.property_id));
  return { ok: true };
}

/** Сохраняет правило доступности календаря. */
export async function saveAvailabilityRule(
  input: AvailabilityRuleInput,
): Promise<ActionResult> {
  const parsed = availabilityRuleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid availability rule." };
  }
  const access = await requireCalendarAccess();
  if (!access.ok) {
    return access;
  }
  const data = parsed.data;
  const calendar = await getOrCreateCalendar(
    data.propertyId,
    access.organizationId,
  );
  if (!calendar) {
    return { ok: false, error: "Could not load the calendar." };
  }

  const supabase = createClient();
  const { error } = await supabase.from("rental_availability_rules").upsert(
    {
      organization_id: access.organizationId,
      calendar_id: calendar.id,
      min_stay: data.minStay,
      max_stay: data.maxStay,
      check_in_days: data.checkInDays,
      check_out_days: data.checkOutDays,
      buffer_days: data.bufferDays,
      default_price: data.defaultPrice,
      weekend_price: data.weekendPrice,
      currency: data.currency,
    },
    { onConflict: "calendar_id" },
  );
  if (error) {
    return { ok: false, error: "Could not save the availability rule." };
  }

  revalidatePath(calendarPath(data.propertyId));
  return { ok: true };
}

/** Добавляет правило цены на диапазон дат. */
export async function savePriceRule(
  input: PriceRuleInput,
): Promise<ActionResult> {
  const parsed = priceRuleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid price rule.",
    };
  }
  const access = await requireCalendarAccess();
  if (!access.ok) {
    return access;
  }
  const data = parsed.data;
  const calendar = await getOrCreateCalendar(
    data.propertyId,
    access.organizationId,
  );
  if (!calendar) {
    return { ok: false, error: "Could not load the calendar." };
  }

  const supabase = createClient();
  const { error } = await supabase.from("rental_price_rules").insert({
    organization_id: access.organizationId,
    calendar_id: calendar.id,
    start_date: data.startDate,
    end_date: data.endDate,
    price: data.price,
    currency: data.currency,
    min_stay: data.minStay,
  });
  if (error) {
    return { ok: false, error: "Could not save the price rule." };
  }

  revalidatePath(calendarPath(data.propertyId));
  return { ok: true };
}

/** Удаляет правило цены. */
export async function deletePriceRule(
  ruleId: string,
): Promise<ActionResult> {
  const access = await requireCalendarAccess();
  if (!access.ok) {
    return access;
  }
  const supabase = createClient();
  const { error } = await supabase
    .from("rental_price_rules")
    .delete()
    .eq("id", ruleId)
    .eq("organization_id", access.organizationId);
  if (error) {
    return { ok: false, error: "Could not delete the price rule." };
  }
  return { ok: true };
}

/** Добавляет источник импорта iCal. */
export async function addImportSource(
  input: ImportSourceInput,
): Promise<ActionResult> {
  const parsed = importSourceSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Enter a valid name and feed URL." };
  }
  const access = await requireCalendarAccess();
  if (!access.ok) {
    return access;
  }
  const data = parsed.data;
  const calendar = await getOrCreateCalendar(
    data.propertyId,
    access.organizationId,
  );
  if (!calendar) {
    return { ok: false, error: "Could not load the calendar." };
  }

  const supabase = createClient();
  const { error } = await supabase.from("ical_import_sources").insert({
    organization_id: access.organizationId,
    calendar_id: calendar.id,
    name: data.name,
    provider: data.provider,
    url: data.url,
  });
  if (error) {
    return { ok: false, error: "Could not add the import source." };
  }

  revalidatePath(calendarPath(data.propertyId));
  return { ok: true };
}

/** Удаляет источник импорта вместе с его событиями. */
export async function deleteImportSource(
  sourceId: string,
): Promise<ActionResult> {
  const access = await requireCalendarAccess();
  if (!access.ok) {
    return access;
  }
  const supabase = createClient();
  const { data: source } = await supabase
    .from("ical_import_sources")
    .select("id")
    .eq("id", sourceId)
    .eq("organization_id", access.organizationId)
    .maybeSingle();
  if (!source) {
    return { ok: false, error: "Import source not found." };
  }

  await supabase
    .from("rental_calendar_events")
    .delete()
    .eq("import_source_id", sourceId);
  const { error } = await supabase
    .from("ical_import_sources")
    .delete()
    .eq("id", sourceId)
    .eq("organization_id", access.organizationId);
  if (error) {
    return { ok: false, error: "Could not delete the import source." };
  }
  return { ok: true };
}

/** Запускает синхронизацию источника импорта. */
export async function syncImportSource(
  sourceId: string,
): Promise<ActionResult> {
  const access = await requireCalendarAccess();
  if (!access.ok) {
    return access;
  }
  const supabase = createClient();
  const { data: source } = await supabase
    .from("ical_import_sources")
    .select("id")
    .eq("id", sourceId)
    .eq("organization_id", access.organizationId)
    .maybeSingle();
  if (!source) {
    return { ok: false, error: "Import source not found." };
  }

  const result = await runIcalSync(sourceId);
  if (!result.ok) {
    return { ok: false, error: result.error ?? "Sync failed." };
  }
  return { ok: true };
}

/** Пересоздаёт токен фида экспорта. */
export async function regenerateExportToken(
  propertyId: string,
): Promise<ActionResult> {
  const access = await requireCalendarAccess();
  if (!access.ok) {
    return access;
  }
  const calendar = await getOrCreateCalendar(
    propertyId,
    access.organizationId,
  );
  if (!calendar) {
    return { ok: false, error: "Could not load the calendar." };
  }

  const supabase = createClient();
  await supabase
    .from("ical_export_tokens")
    .update({ is_active: false })
    .eq("calendar_id", calendar.id);
  const { error } = await supabase.from("ical_export_tokens").insert({
    organization_id: access.organizationId,
    calendar_id: calendar.id,
    token: generateFeedToken(),
  });
  if (error) {
    return { ok: false, error: "Could not regenerate the feed token." };
  }

  revalidatePath(calendarPath(propertyId));
  return { ok: true };
}
