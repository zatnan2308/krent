import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ROUTES } from "@/lib/constants/routes";
import { createAdminClient } from "@/lib/supabase/server";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

export const metadata: Metadata = { title: "Calendar" };
export const dynamic = "force-dynamic";

const DAYS = 30;

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

export default async function CalendarOverviewPage() {
  const context = await requireOrganizationContext();
  if (!context.organization) return null;
  if (!hasPermission(context, "calendar.view")) {
    redirect(ROUTES.dashboard.root);
  }

  const admin = createAdminClient();
  const today = new Date();
  const startIso = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    .toISOString()
    .slice(0, 10);
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + DAYS);
  const endIso = endDate.toISOString().slice(0, 10);

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
      .gte("end_date", startIso)
      .lte("start_date", endIso),
  ]);

  const propList = props ?? [];
  const eventList = events ?? [];

  const dayHeaders: string[] = [];
  for (let i = 0; i < DAYS; i += 1) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    dayHeaders.push(
      d.toLocaleDateString("en-US", { day: "2-digit", month: "short" }),
    );
  }

  function eventForDay(propertyId: string, dayIdx: number) {
    const day = new Date(today);
    day.setDate(day.getDate() + dayIdx);
    return eventList.find((event) => {
      if (event.property_id !== propertyId) return false;
      const s = new Date(event.start_date);
      const e = new Date(event.end_date);
      return s <= day && day < e;
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
        <p className="text-sm text-muted-foreground">
          Next {DAYS} days · all rentable properties at a glance.
        </p>
      </div>

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
                    {dayHeaders.map((label, idx) => (
                      <th key={idx} className="border-b p-1 text-center font-normal">
                        {label}
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
                      {dayHeaders.map((_, idx) => {
                        const ev = eventForDay(p.id, idx);
                        return (
                          <td key={idx} className="border-b p-0.5">
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cleaning between stays</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Auto-detected gaps between consecutive bookings. Schedule
            cleanings before the next check-in.
          </p>
          <ul className="mt-3 space-y-1 text-sm">
            {(() => {
              const rows: {
                propertyId: string;
                propertyTitle: string;
                date: string;
              }[] = [];
              for (const p of propList) {
                const sorted = eventList
                  .filter(
                    (e) => e.property_id === p.id && e.status === "booked",
                  )
                  .sort((a, b) =>
                    a.start_date < b.start_date ? -1 : 1,
                  );
                for (let i = 0; i < sorted.length - 1; i += 1) {
                  const left = sorted[i];
                  if (!left) continue;
                  rows.push({
                    propertyId: p.id,
                    propertyTitle: p.title,
                    date: left.end_date,
                  });
                }
              }
              if (rows.length === 0) {
                return (
                  <li className="text-xs text-muted-foreground">
                    No back-to-back bookings in the next {DAYS} days.
                  </li>
                );
              }
              return rows.map((row, idx) => (
                <li
                  key={idx}
                  className="flex items-center justify-between rounded-md border p-2"
                >
                  <span>{row.propertyTitle}</span>
                  <Badge variant="outline">
                    Clean on {new Date(row.date).toLocaleDateString()}
                  </Badge>
                </li>
              ));
            })()}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
