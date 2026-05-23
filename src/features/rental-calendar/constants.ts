import type {
  CalendarEventSource,
  CalendarEventStatus,
  IcalProvider,
} from "./types";

export const EVENT_STATUS_LABELS: Record<CalendarEventStatus, string> = {
  available: "Available",
  booked: "Booked",
  blocked: "Blocked",
  pending: "Pending",
  maintenance: "Maintenance",
  cleaning: "Cleaning",
};

export const EVENT_SOURCE_LABELS: Record<CalendarEventSource, string> = {
  manual: "Manual",
  direct: "Direct",
  airbnb: "Airbnb",
  booking: "Booking.com",
  vrbo: "VRBO",
  google: "Google",
  owner: "Owner",
  maintenance: "Maintenance",
  cleaning: "Cleaning",
};

export const PROVIDER_LABELS: Record<IcalProvider, string> = {
  airbnb: "Airbnb",
  booking: "Booking.com",
  vrbo: "VRBO",
  google: "Google Calendar",
  custom: "Custom",
};

/** Класс фона ячейки календаря по статусу занятости. */
export const STATUS_CELL_CLASS: Record<CalendarEventStatus, string> = {
  available: "bg-background",
  booked: "bg-rose-100 text-rose-900",
  blocked: "bg-slate-200 text-slate-700",
  pending: "bg-amber-100 text-amber-900",
  maintenance: "bg-orange-100 text-orange-900",
  cleaning: "bg-sky-100 text-sky-900",
};

/** Статусы, доступные для ручной блокировки дат. */
export type BlockStatus = "blocked" | "maintenance" | "cleaning";

export const BLOCK_STATUS_OPTIONS: { value: BlockStatus; label: string }[] = [
  { value: "blocked", label: "Blocked" },
  { value: "maintenance", label: "Maintenance" },
  { value: "cleaning", label: "Cleaning" },
];

export const PROVIDER_OPTIONS: { value: IcalProvider; label: string }[] = [
  { value: "airbnb", label: "Airbnb" },
  { value: "booking", label: "Booking.com" },
  { value: "vrbo", label: "VRBO" },
  { value: "google", label: "Google Calendar" },
  { value: "custom", label: "Custom" },
];

/** Источник события по провайдеру импорта. */
export const PROVIDER_EVENT_SOURCE: Record<IcalProvider, CalendarEventSource> = {
  airbnb: "airbnb",
  booking: "booking",
  vrbo: "vrbo",
  google: "google",
  custom: "direct",
};

/** Источник события для ручной блокировки по выбранному статусу. */
export const BLOCK_EVENT_SOURCE: Record<BlockStatus, CalendarEventSource> = {
  blocked: "manual",
  maintenance: "maintenance",
  cleaning: "cleaning",
};

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
