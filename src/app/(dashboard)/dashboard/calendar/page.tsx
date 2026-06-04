import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import {
  currentMonth,
  monthLabel,
  shiftMonth,
} from "@/features/rental-calendar/date-utils";
import { ROUTES } from "@/lib/constants/routes";
import { createAdminClient } from "@/lib/supabase/server";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

export const metadata: Metadata = { title: "Calendar" };
export const dynamic = "force-dynamic";

const BUSY_STATUSES = ["booked", "pending"];

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

function colorFor(status: string): string {
  switch (status) {
    case "booked":
      return "bg-emerald-500";
    case "pending":
      return "bg-amber-400";
    case "blocked":
      return "bg-rose-500";
    case "maintenance":
      return "bg-slate-500";
    case "cleaning":
      return "bg-sky-400";
    default:
      return "bg-muted";
  }
}

export default async function CalendarOverviewPage({
  searchParams,
}: {
  searchParams: { m?: string };
}) {
  const context = await requireOrganizationContext();
  if (!context.organization) return null;
  if (!hasPermission(context, "calendar.view")) {
    redirect(ROUTES.dashboard.root);
  }

  const offset = Number.parseInt(searchParams.m ?? "0", 10) || 0;
  const month = shiftMonth(currentMonth(), offset);
  const daysInMonth = new Date(
    Date.UTC(month.year, month.month, 0),
  ).getUTCDate();
  const days: string[] = [];
  for (let d = 1; d <= daysInMonth; d += 1) {
    days.push(`${month.year}-${pad(month.month)}-${pad(d)}`);
  }
  const firstIso = days[0]!;
  const lastIso = days[days.length - 1]!;

  const admin = createAdminClient();
  const [{ data: props }, { data: events }] = await Promise.all([
    admin
      .from("properties")
      .select("id, title")
      .eq("organization_id", context.organization.id)
      .in("purpose", ["short_term_rental", "long_term_rent", "mixed"])
      .order("title"),
    admin
      .from("rental_calendar_events")
      .select("property_id, status, start_date, end_date, title")
      .eq("organization_id", context.organization.id)
      .gte("end_date", firstIso)
      .lte("start_date", lastIso),
  ]);
  const propList = props ?? [];
  const eventList = events ?? [];

  function eventForDay(propertyId: string, dayIso: string) {
    return eventList.find(
      (event) =>
        event.property_id === propertyId &&
        event.start_date <= dayIso &&
        dayIso < event.end_date,
    );
  }

  function occupancy(propertyId: string): number {
    let busy = 0;
    for (const day of days) {
      const event = eventForDay(propertyId, day);
      if (event && BUSY_STATUSES.includes(event.status)) {
        busy += 1;
      }
    }
    return Math.round((busy / daysInMonth) * 100);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendar"
        description="Occupancy across all rentable properties."
        actions={
          <>
            <Link
              href={`${ROUTES.dashboard.calendar}?m=${offset - 1}`}
              aria-label="Previous month"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border bg-background transition-colors hover:bg-accent"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <span className="min-w-40 text-center text-sm font-medium tabular-nums">
              {monthLabel(month)}
            </span>
            <Link
              href={`${ROUTES.dashboard.calendar}?m=${offset + 1}`}
              aria-label="Next month"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border bg-background transition-colors hover:bg-accent"
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
            {offset !== 0 ? (
              <Link
                href={ROUTES.dashboard.calendar}
                className="text-sm text-muted-foreground hover:underline"
              >
                Today
              </Link>
            ) : null}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-3 text-xs">
        {[
          { label: "Booked", status: "booked" },
          { label: "Pending", status: "pending" },
          { label: "Blocked", status: "blocked" },
          { label: "Maintenance", status: "maintenance" },
          { label: "Cleaning", status: "cleaning" },
        ].map((item) => (
          <span key={item.status} className="inline-flex items-center gap-1">
            <span className={`h-3 w-3 rounded-sm ${colorFor(item.status)}`} />
            {item.label}
          </span>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Occupancy grid</CardTitle>
        </CardHeader>
        <CardContent>
          {propList.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No rentable properties yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0 text-xs">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 border-b bg-background p-1 text-left">
                      Property
                    </th>
                    <th className="border-b p-1 text-center font-normal">%</th>
                    {days.map((day) => (
                      <th
                        key={day}
                        className="border-b p-1 text-center font-normal"
                      >
                        {Number(day.slice(8))}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {propList.map((p) => (
                    <tr key={p.id}>
                      <td className="sticky left-0 z-10 border-b bg-background p-1">
                        <Link
                          href={`${ROUTES.dashboard.properties}/${p.id}/calendar`}
                          className="hover:underline"
                        >
                          {p.title}
                        </Link>
                      </td>
                      <td className="border-b p-1 text-center tabular-nums text-muted-foreground">
                        {occupancy(p.id)}%
                      </td>
                      {days.map((day) => {
                        const ev = eventForDay(p.id, day);
                        return (
                          <td key={day} className="border-b p-0.5">
                            <div
                              className={`h-5 w-5 rounded-sm ${ev ? colorFor(ev.status) : "bg-muted/30"}`}
                              title={ev?.title ?? ""}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
