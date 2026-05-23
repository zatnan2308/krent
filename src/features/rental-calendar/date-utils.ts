function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

/** Парсит "YYYY-MM-DD" в UTC-дату. */
function toUtcDate(iso: string): Date {
  const parts = iso.split("-");
  const year = Number(parts[0] ?? "1970");
  const month = Number(parts[1] ?? "1");
  const day = Number(parts[2] ?? "1");
  return new Date(Date.UTC(year, month - 1, day));
}

/** Форматирует UTC-дату как "YYYY-MM-DD". */
function toIso(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(
    date.getUTCDate(),
  )}`;
}

export function todayIso(): string {
  return toIso(new Date());
}

/** Прибавляет дни к ISO-дате. */
export function addDays(iso: string, days: number): string {
  const date = toUtcDate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return toIso(date);
}

/** День недели: 0 — воскресенье ... 6 — суббота. */
export function dayOfWeek(iso: string): number {
  return toUtcDate(iso).getUTCDay();
}

/** Количество ночей между двумя ISO-датами. */
export function nightsBetween(start: string, end: string): number {
  return Math.round(
    (toUtcDate(end).getTime() - toUtcDate(start).getTime()) / 86400000,
  );
}

export interface MonthInfo {
  year: number;
  /** Месяц 1-12. */
  month: number;
}

export function currentMonth(): MonthInfo {
  const now = new Date();
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
}

/** Сдвигает месяц на delta месяцев. */
export function shiftMonth(info: MonthInfo, delta: number): MonthInfo {
  const date = new Date(Date.UTC(info.year, info.month - 1 + delta, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

export function monthLabel(info: MonthInfo): string {
  return new Date(Date.UTC(info.year, info.month - 1, 1)).toLocaleDateString(
    "en-US",
    { month: "long", year: "numeric", timeZone: "UTC" },
  );
}

/** Сетка месяца (понедельник первым): недели по 7 ISO-дат либо null. */
export function monthGrid(info: MonthInfo): (string | null)[][] {
  const first = new Date(Date.UTC(info.year, info.month - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(info.year, info.month, 0)).getUTCDate();

  const cells: (string | null)[] = [];
  for (let i = 0; i < offset; i += 1) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(toIso(new Date(Date.UTC(info.year, info.month - 1, day))));
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

/** ISO-дата -> компактный iCal-формат "YYYYMMDD". */
export function toIcalDate(iso: string): string {
  return iso.replace(/-/g, "");
}

/** iCal-значение даты ("YYYYMMDD" или "YYYYMMDDT...") -> "YYYY-MM-DD". */
export function fromIcalDate(value: string): string | null {
  const digits = value.trim().slice(0, 8);
  if (!/^\d{8}$/.test(digits)) {
    return null;
  }
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

export function formatDateDisplay(iso: string): string {
  return toUtcDate(iso).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
