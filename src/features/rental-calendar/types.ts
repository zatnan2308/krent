import type { Enums, Tables } from "@/types/database";

export type RentalCalendar = Tables<"rental_calendars">;
export type RentalCalendarEvent = Tables<"rental_calendar_events">;
export type RentalAvailabilityRule = Tables<"rental_availability_rules">;
export type RentalPriceRule = Tables<"rental_price_rules">;
export type IcalImportSource = Tables<"ical_import_sources">;
export type IcalSyncLog = Tables<"ical_sync_logs">;
export type IcalExportToken = Tables<"ical_export_tokens">;

export type CalendarEventSource = Enums<"calendar_event_source">;
export type CalendarEventStatus = Enums<"calendar_event_status">;
export type IcalProvider = Enums<"ical_provider">;
export type IcalSyncStatus = Enums<"ical_sync_status">;
