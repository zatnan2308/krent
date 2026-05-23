import { NextResponse } from "next/server";

import { serializeCalendar } from "@/features/rental-calendar/ical";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-fA-F-]{36}$/;

/**
 * iCal-фид занятости объекта: /api/calendar/properties/{id}.ics?token=...
 * Доступ защищён токеном фида (ical_export_tokens).
 */
export async function GET(
  request: Request,
  { params }: { params: { propertyId: string } },
) {
  const propertyId = params.propertyId.replace(/\.ics$/i, "");
  const token = new URL(request.url).searchParams.get("token");

  if (!token) {
    return new NextResponse("Missing feed token", { status: 401 });
  }
  if (!UUID_PATTERN.test(propertyId)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const admin = createAdminClient();

  const { data: calendar } = await admin
    .from("rental_calendars")
    .select("id")
    .eq("property_id", propertyId)
    .maybeSingle();
  if (!calendar) {
    return new NextResponse("Calendar not found", { status: 404 });
  }

  const { data: tokenRow } = await admin
    .from("ical_export_tokens")
    .select("id")
    .eq("calendar_id", calendar.id)
    .eq("token", token)
    .eq("is_active", true)
    .maybeSingle();
  if (!tokenRow) {
    return new NextResponse("Invalid feed token", { status: 403 });
  }

  await admin
    .from("ical_export_tokens")
    .update({ last_accessed_at: new Date().toISOString() })
    .eq("id", tokenRow.id);

  const { data: events } = await admin
    .from("rental_calendar_events")
    .select("id, status, start_date, end_date, title")
    .eq("calendar_id", calendar.id)
    .neq("status", "available");

  const ics = serializeCalendar(
    (events ?? []).map((event) => ({
      uid: `${event.id}@krent`,
      startDate: event.start_date,
      endDate: event.end_date,
      summary: event.title ?? "Reserved",
    })),
    "Krent rental calendar",
  );

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${propertyId}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
