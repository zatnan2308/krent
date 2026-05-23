"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";

import {
  createCalendarEvent,
  deleteCalendarEvent,
} from "@/features/rental-calendar/actions";
import {
  BLOCK_STATUS_OPTIONS,
  EVENT_SOURCE_LABELS,
  EVENT_STATUS_LABELS,
  STATUS_CELL_CLASS,
  WEEKDAY_LABELS,
  type BlockStatus,
} from "@/features/rental-calendar/constants";
import {
  addDays,
  currentMonth,
  formatDateDisplay,
  monthGrid,
  monthLabel,
  shiftMonth,
  todayIso,
  type MonthInfo,
} from "@/features/rental-calendar/date-utils";
import type {
  CalendarEventStatus,
  RentalCalendarEvent,
} from "@/features/rental-calendar/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const FIELD_CLASS =
  "flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const STATUS_PRIORITY: Record<CalendarEventStatus, number> = {
  booked: 5,
  pending: 4,
  blocked: 3,
  maintenance: 2,
  cleaning: 1,
  available: 0,
};

const LEGEND: CalendarEventStatus[] = [
  "booked",
  "pending",
  "blocked",
  "maintenance",
  "cleaning",
];

interface CalendarBoardProps {
  propertyId: string;
  events: RentalCalendarEvent[];
}

/** Сетка месяца с занятостью и ручной блокировкой дат. */
export function CalendarBoard({ propertyId, events }: CalendarBoardProps) {
  const router = useRouter();
  const [month, setMonth] = React.useState<MonthInfo>(() => currentMonth());
  const [rangeStart, setRangeStart] = React.useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = React.useState<string | null>(null);
  const [blockStatus, setBlockStatus] = React.useState<BlockStatus>("blocked");
  const [title, setTitle] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const weeks = monthGrid(month);
  const today = todayIso();

  function eventForDay(iso: string): RentalCalendarEvent | null {
    let best: RentalCalendarEvent | null = null;
    for (const event of events) {
      if (event.start_date <= iso && iso < event.end_date) {
        if (
          !best ||
          STATUS_PRIORITY[event.status] > STATUS_PRIORITY[best.status]
        ) {
          best = event;
        }
      }
    }
    return best;
  }

  function inSelectedRange(iso: string): boolean {
    if (rangeStart && rangeEnd) {
      return iso >= rangeStart && iso <= rangeEnd;
    }
    return iso === rangeStart;
  }

  function handleDayClick(iso: string) {
    setError(null);
    if (!rangeStart || rangeEnd) {
      setRangeStart(iso);
      setRangeEnd(null);
      return;
    }
    if (iso < rangeStart) {
      setRangeEnd(rangeStart);
      setRangeStart(iso);
    } else {
      setRangeEnd(iso);
    }
  }

  async function handleBlock() {
    if (!rangeStart) {
      return;
    }
    const end = rangeEnd ?? rangeStart;
    setPending(true);
    setError(null);
    const result = await createCalendarEvent({
      propertyId,
      status: blockStatus,
      startDate: rangeStart,
      endDate: addDays(end, 1),
      title: title.trim() || null,
    });
    setPending(false);
    if (result.ok) {
      setRangeStart(null);
      setRangeEnd(null);
      setTitle("");
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  async function handleDelete(eventId: string) {
    setPending(true);
    setError(null);
    const result = await deleteCalendarEvent(eventId);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
    }
    router.refresh();
  }

  const upcomingEvents = [...events]
    .filter((event) => event.end_date >= today)
    .sort((a, b) => a.start_date.localeCompare(b.start_date));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Previous month"
          onClick={() => setMonth((value) => shiftMonth(value, -1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <p className="text-sm font-semibold">{monthLabel(month)}</p>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Next month"
          onClick={() => setMonth((value) => shiftMonth(value, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="overflow-hidden rounded-md border">
        <div className="grid grid-cols-7 border-b bg-muted/50">
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="p-2 text-center text-xs font-medium text-muted-foreground"
            >
              {label}
            </div>
          ))}
        </div>
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7">
            {week.map((iso, dayIndex) => {
              if (!iso) {
                return (
                  <div
                    key={`empty-${weekIndex}-${dayIndex}`}
                    className="aspect-square border-b border-r bg-muted/20"
                  />
                );
              }
              const event = eventForDay(iso);
              const cellStatus: CalendarEventStatus =
                event?.status ?? "available";
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => handleDayClick(iso)}
                  className={cn(
                    "aspect-square border-b border-r p-1 text-left text-xs transition-colors",
                    STATUS_CELL_CLASS[cellStatus],
                    inSelectedRange(iso) &&
                      "ring-2 ring-inset ring-primary",
                    iso === today && "font-bold underline",
                  )}
                >
                  {Number(iso.slice(8, 10))}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {LEGEND.map((status) => (
          <span key={status} className="flex items-center gap-1.5">
            <span
              className={cn(
                "h-3 w-3 rounded-sm border",
                STATUS_CELL_CLASS[status],
              )}
            />
            {EVENT_STATUS_LABELS[status]}
          </span>
        ))}
      </div>

      {rangeStart ? (
        <div className="space-y-3 rounded-md border p-3">
          <p className="text-sm">
            Selected: {formatDateDisplay(rangeStart)} &rarr;{" "}
            {formatDateDisplay(rangeEnd ?? rangeStart)}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className={FIELD_CLASS}
              value={blockStatus}
              aria-label="Block type"
              onChange={(event) =>
                setBlockStatus(event.target.value as BlockStatus)
              }
            >
              {BLOCK_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Input
              className="w-48"
              value={title}
              placeholder="Note (optional)"
              onChange={(event) => setTitle(event.target.value)}
            />
            <Button type="button" disabled={pending} onClick={handleBlock}>
              Create block
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={() => {
                setRangeStart(null);
                setRangeEnd(null);
              }}
            >
              Clear
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Click a start date and an end date to block a range.
        </p>
      )}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div>
        <p className="mb-2 text-sm font-medium">Upcoming events</p>
        {upcomingEvents.length > 0 ? (
          <ul className="divide-y rounded-md border">
            {upcomingEvents.map((event) => (
              <li
                key={event.id}
                className="flex items-center justify-between gap-3 p-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    {EVENT_STATUS_LABELS[event.status]} ·{" "}
                    {EVENT_SOURCE_LABELS[event.source]}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateDisplay(event.start_date)} &rarr;{" "}
                    {formatDateDisplay(event.end_date)}
                    {event.title ? ` · ${event.title}` : ""}
                  </p>
                </div>
                {event.import_source_id === null ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-destructive"
                    disabled={pending}
                    aria-label="Delete event"
                    onClick={() => handleDelete(event.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No upcoming events.</p>
        )}
      </div>
    </div>
  );
}
