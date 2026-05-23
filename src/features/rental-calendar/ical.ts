import { fromIcalDate, toIcalDate } from "./date-utils";

export interface IcalEventInput {
  uid: string;
  /** ISO-дата "YYYY-MM-DD". */
  startDate: string;
  /** ISO-дата "YYYY-MM-DD" (день выезда, эксклюзивно). */
  endDate: string;
  summary: string;
}

export interface ParsedIcalEvent {
  uid: string;
  startDate: string;
  endDate: string;
  summary: string;
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function icalStamp(): string {
  return `${new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15)}Z`;
}

/** Собирает VCALENDAR из событий (даты в формате VALUE=DATE). */
export function serializeCalendar(
  events: IcalEventInput[],
  calendarName: string,
): string {
  const stamp = icalStamp();
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Krent//Rental Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(calendarName)}`,
  ];
  for (const event of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${toIcalDate(event.startDate)}`,
      `DTEND;VALUE=DATE:${toIcalDate(event.endDate)}`,
      `SUMMARY:${escapeText(event.summary)}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

/**
 * Разбирает VCALENDAR и извлекает VEVENT с датами начала и конца.
 * Подходит для iCal-фидов Airbnb / Booking.com / VRBO.
 */
export function parseCalendar(text: string): ParsedIcalEvent[] {
  // Разворачиваем сложенные строки (продолжение начинается с пробела/таба).
  const unfolded = text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "");
  const lines = unfolded.split("\n");
  const events: ParsedIcalEvent[] = [];
  let current: Partial<ParsedIcalEvent> | null = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      current = {};
      continue;
    }
    if (line === "END:VEVENT") {
      if (
        current &&
        current.uid &&
        current.startDate &&
        current.endDate
      ) {
        events.push({
          uid: current.uid,
          startDate: current.startDate,
          endDate: current.endDate,
          summary: current.summary ?? "Reserved",
        });
      }
      current = null;
      continue;
    }
    if (!current) {
      continue;
    }
    const colon = line.indexOf(":");
    if (colon === -1) {
      continue;
    }
    const key = (line.slice(0, colon).split(";")[0] ?? "").toUpperCase();
    const value = line.slice(colon + 1);
    if (key === "UID") {
      current.uid = value.trim();
    } else if (key === "SUMMARY") {
      current.summary = value.trim();
    } else if (key === "DTSTART") {
      const parsed = fromIcalDate(value);
      if (parsed) {
        current.startDate = parsed;
      }
    } else if (key === "DTEND") {
      const parsed = fromIcalDate(value);
      if (parsed) {
        current.endDate = parsed;
      }
    }
  }
  return events;
}
