import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, CalendarCheck, KeyRound, Plug } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { ROUTES } from "@/lib/constants/routes";
import { getServerDictionary } from "@/lib/i18n/runtime";
import { createAdminClient } from "@/lib/supabase/server";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

export const metadata: Metadata = { title: "Rentals" };
export const dynamic = "force-dynamic";

const DAYS = 30;
const RENTABLE_PURPOSES = [
  "short_term_rental",
  "long_term_rent",
  "mixed",
] as const;
const BUSY_STATUSES = ["booked", "pending"];

/** Вариант бейджа для статуса iCal-синхронизации. */
function syncBadgeVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "error" || status === "failed") return "destructive";
  if (status === "success" || status === "ok") return "default";
  return "secondary";
}

export default async function RentalsPage() {
  const context = await requireOrganizationContext();
  if (!context.organization) return null;
  if (!hasPermission(context, "rentals.view")) {
    redirect(ROUTES.dashboard.root);
  }
  const orgId = context.organization.id;
  const admin = createAdminClient();
  const dict = await getServerDictionary();
  const t = dict.dashRentals;
  const purposeLabel = (p: string): string =>
    p === "short_term_rental"
      ? t.purposeShort
      : p === "long_term_rent"
        ? t.purposeLong
        : p === "mixed"
          ? t.purposeMixed
          : p;
  const syncStatusLabel = (s: string): string =>
    s === "success" || s === "ok"
      ? t.syncSuccess
      : s === "error" || s === "failed"
        ? t.syncError
        : t.syncRunning;

  const today = new Date();
  const startIso = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  )
    .toISOString()
    .slice(0, 10);
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + DAYS);
  const endIso = endDate.toISOString().slice(0, 10);

  const [propsRes, eventsRes, bookingsRes, sourcesRes] = await Promise.all([
    admin
      .from("properties")
      .select("id, title, purpose")
      .eq("organization_id", orgId)
      .in("purpose", RENTABLE_PURPOSES)
      .order("title"),
    admin
      .from("rental_calendar_events")
      .select("property_id, status, start_date, end_date")
      .eq("organization_id", orgId)
      .gte("end_date", startIso)
      .lte("start_date", endIso),
    admin
      .from("rental_bookings")
      .select("property_id, check_in, status")
      .eq("organization_id", orgId)
      .gte("check_in", startIso)
      .in("status", ["pending", "confirmed"]),
    admin
      .from("ical_import_sources")
      .select("id, name, calendar_id, provider, last_synced_at, is_active")
      .eq("organization_id", orgId),
  ]);

  const propList = propsRes.data ?? [];
  const eventList = eventsRes.data ?? [];
  const bookingList = bookingsRes.data ?? [];
  const sourceList = sourcesRes.data ?? [];

  // Карта calendar_id → property_id, чтобы привязать iCal-источники к объектам.
  let calendarToProperty = new Map<string, string>();
  if (sourceList.length > 0) {
    const { data: calendars } = await admin
      .from("rental_calendars")
      .select("id, property_id")
      .eq("organization_id", orgId);
    calendarToProperty = new Map(
      (calendars ?? []).map((c) => [c.id, c.property_id]),
    );
  }

  // Последние записи синхронизации по всем источникам организации.
  let syncLogs: {
    id: string;
    sourceName: string;
    status: string;
    eventsImported: number;
    message: string | null;
    createdAt: string;
  }[] = [];
  if (sourceList.length > 0) {
    const { data: logs } = await admin
      .from("ical_sync_logs")
      .select("id, import_source_id, status, events_imported, message, created_at")
      .in(
        "import_source_id",
        sourceList.map((s) => s.id),
      )
      .order("created_at", { ascending: false })
      .limit(10);
    syncLogs = (logs ?? []).map((log) => ({
      id: log.id,
      sourceName:
        sourceList.find((s) => s.id === log.import_source_id)?.name ?? "Source",
      status: log.status,
      eventsImported: log.events_imported,
      message: log.message,
      createdAt: log.created_at,
    }));
  }

  /** Доля занятых дней (booked/pending) из следующих DAYS дней, в процентах. */
  function occupancyFor(propertyId: string): number {
    let busy = 0;
    for (let i = 0; i < DAYS; i += 1) {
      const day = new Date(today);
      day.setDate(day.getDate() + i);
      const hit = eventList.some((e) => {
        if (e.property_id !== propertyId) return false;
        if (!BUSY_STATUSES.includes(e.status)) return false;
        return new Date(e.start_date) <= day && day < new Date(e.end_date);
      });
      if (hit) busy += 1;
    }
    return Math.round((busy / DAYS) * 100);
  }

  function bookingsFor(propertyId: string): number {
    return bookingList.filter((b) => b.property_id === propertyId).length;
  }

  function sourcesFor(propertyId: string) {
    return sourceList.filter(
      (s) => calendarToProperty.get(s.calendar_id) === propertyId,
    );
  }

  const avgOccupancy =
    propList.length > 0
      ? Math.round(
          propList.reduce((sum, p) => sum + occupancyFor(p.id), 0) /
            propList.length,
        )
      : 0;
  const activeSources = sourceList.filter((s) => s.is_active).length;

  const summary = [
    {
      label: t.statRentable,
      value: propList.length,
      icon: KeyRound,
    },
    {
      label: t.statOccupancy.replace("{n}", String(DAYS)),
      value: `${avgOccupancy}%`,
      icon: CalendarDays,
    },
    {
      label: t.statUpcoming,
      value: bookingList.length,
      icon: CalendarCheck,
    },
    {
      label: t.statSources,
      value: activeSources,
      icon: Plug,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.title}
        description={t.description}
        actions={
          <>
            <Link
              href={ROUTES.dashboard.calendar}
              className={buttonVariants({ variant: "outline" })}
            >
              <CalendarDays className="mr-2 h-4 w-4" />
              {t.calendar}
            </Link>
            <Link
              href={ROUTES.dashboard.bookings}
              className={buttonVariants({ variant: "outline" })}
            >
              <CalendarCheck className="mr-2 h-4 w-4" />
              {t.bookings}
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summary.map((item) => (
          <StatCard
            key={item.label}
            label={item.label}
            value={item.value}
            icon={item.icon}
          />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.properties}</CardTitle>
        </CardHeader>
        <CardContent>
          {propList.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.noRentable}</p>
          ) : (
            <div className="space-y-3">
              {propList.map((p) => {
                const occupancy = occupancyFor(p.id);
                const sources = sourcesFor(p.id);
                return (
                  <div
                    key={p.id}
                    className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`${ROUTES.dashboard.properties}/${p.id}/calendar`}
                          className="truncate font-medium hover:underline"
                        >
                          {p.title}
                        </Link>
                        <Badge variant="outline" className="shrink-0">
                          {purposeLabel(p.purpose)}
                        </Badge>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-2 w-40 max-w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${occupancy}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {occupancy}% · {bookingsFor(p.id)} {t.upcomingShort}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        {sources.length === 0
                          ? t.noSources
                          : t.sourcesCount.replace(
                              "{n}",
                              String(sources.length),
                            )}
                      </span>
                      <Link
                        href={`${ROUTES.dashboard.properties}/${p.id}/calendar`}
                        className="inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium hover:bg-accent"
                      >
                        {t.manageCalendar}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.recentSync}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t.recentSyncDesc}</p>
          {syncLogs.length === 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">
              {t.noSyncActivity}
            </p>
          ) : (
            <ul className="mt-3 space-y-1 text-sm">
              {syncLogs.map((log) => (
                <li
                  key={log.id}
                  className="flex items-center justify-between gap-3 rounded-md border p-2"
                >
                  <div className="min-w-0">
                    <span className="font-medium">{log.sourceName}</span>
                    {log.message ? (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {log.message}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {t.eventsCount.replace(
                        "{n}",
                        String(log.eventsImported),
                      )}{" "}
                      · {new Date(log.createdAt).toLocaleString()}
                    </span>
                    <Badge variant={syncBadgeVariant(log.status)}>
                      {syncStatusLabel(log.status)}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
