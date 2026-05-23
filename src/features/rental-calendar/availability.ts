/** Полуоткрытые интервалы [start, end) пересекаются. */
export function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  // new_check_in < existing_check_out && new_check_out > existing_check_in
  return aStart < bEnd && aEnd > bStart;
}

/** Статусы, занимающие даты — конфликтуют с новым бронированием. */
const OCCUPYING_STATUSES = new Set([
  "booked",
  "blocked",
  "pending",
  "maintenance",
  "cleaning",
]);

interface OccupyingEvent {
  id: string;
  status: string;
  start_date: string;
  end_date: string;
}

/**
 * Находит события, пересекающиеся с диапазоном (защита от double booking).
 * Учитываются только занимающие даты статусы.
 */
export function findConflicts<T extends OccupyingEvent>(
  events: T[],
  startDate: string,
  endDate: string,
  excludeId?: string,
): T[] {
  return events.filter(
    (event) =>
      event.id !== excludeId &&
      OCCUPYING_STATUSES.has(event.status) &&
      rangesOverlap(startDate, endDate, event.start_date, event.end_date),
  );
}

/** Свободен ли диапазон дат у объекта. */
export function isRangeAvailable<T extends OccupyingEvent>(
  events: T[],
  startDate: string,
  endDate: string,
): boolean {
  return findConflicts(events, startDate, endDate).length === 0;
}
