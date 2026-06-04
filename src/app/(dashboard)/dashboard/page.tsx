import type { Metadata } from "next";
import Link from "next/link";
import {
  Building2,
  CalendarCheck,
  ListTodo,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { ROUTES } from "@/lib/constants/routes";
import { createAdminClient } from "@/lib/supabase/server";
import { requireOrganizationContext } from "@/server/organization-context";

export const metadata: Metadata = {
  title: "Dashboard",
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const context = await requireOrganizationContext();

  // Состояние «нет организации» обрабатывает layout группы.
  if (!context.organization) {
    return null;
  }
  const orgId = context.organization.id;
  const admin = createAdminClient();

  const now = new Date();
  const todayIso = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    .toISOString()
    .slice(0, 10);
  const weekAgoIso = new Date(now.getTime() - 7 * 86400000).toISOString();

  const [
    activeListings,
    newLeads,
    upcomingCount,
    openTasks,
    upcomingBookings,
    recentLeads,
  ] = await Promise.all([
    admin
      .from("properties")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("status", "active"),
    admin
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .gte("created_at", weekAgoIso),
    admin
      .from("rental_bookings")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .gte("check_in", todayIso)
      .in("status", ["pending", "confirmed"]),
    admin
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .is("completed_at", null),
    admin
      .from("rental_bookings")
      .select("id, reference, property_id, guest_name, check_in, status")
      .eq("organization_id", orgId)
      .gte("check_in", todayIso)
      .in("status", ["pending", "confirmed"])
      .order("check_in", { ascending: true })
      .limit(5),
    admin
      .from("leads")
      .select("id, type, status, created_at, contact_id")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const bookingList = upcomingBookings.data ?? [];
  const propertyIds = [...new Set(bookingList.map((b) => b.property_id))];
  const titles = new Map<string, string>();
  if (propertyIds.length > 0) {
    const { data } = await admin
      .from("properties")
      .select("id, title")
      .in("id", propertyIds);
    for (const property of data ?? []) {
      titles.set(property.id, property.title);
    }
  }

  const leadList = recentLeads.data ?? [];
  const contactIds = leadList
    .map((l) => l.contact_id)
    .filter((id): id is string => Boolean(id));
  const names = new Map<string, string>();
  if (contactIds.length > 0) {
    const { data } = await admin
      .from("contacts")
      .select("id, full_name")
      .in("id", contactIds);
    for (const contact of data ?? []) {
      names.set(contact.id, contact.full_name);
    }
  }

  const metrics = [
    {
      label: "Active listings",
      value: activeListings.count ?? 0,
      icon: Building2,
      href: ROUTES.dashboard.properties,
    },
    {
      label: "New leads · 7d",
      value: newLeads.count ?? 0,
      icon: Users,
      href: ROUTES.dashboard.crm,
    },
    {
      label: "Upcoming check-ins",
      value: upcomingCount.count ?? 0,
      icon: CalendarCheck,
      href: ROUTES.dashboard.bookings,
    },
    {
      label: "Open tasks",
      value: openTasks.count ?? 0,
      icon: ListTodo,
      href: `${ROUTES.dashboard.crm}/tasks`,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={context.organization.name}
        description="Key metrics and what's coming up across your workspace."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <StatCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            icon={metric.icon}
            href={metric.href}
          />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upcoming check-ins</CardTitle>
          </CardHeader>
          <CardContent>
            {bookingList.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No upcoming check-ins.
              </p>
            ) : (
              <ul className="space-y-1 text-sm">
                {bookingList.map((booking) => (
                  <li key={booking.id}>
                    <Link
                      href={`${ROUTES.dashboard.bookings}/${booking.id}`}
                      className="flex items-center justify-between gap-3 rounded-md border p-2 hover:bg-muted/50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {titles.get(booking.property_id) ?? "Property"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {booking.guest_name ?? "Guest"} · {booking.reference}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-xs tabular-nums">
                          {new Date(booking.check_in).toLocaleDateString()}
                        </span>
                        <Badge
                          variant={
                            booking.status === "confirmed"
                              ? "default"
                              : "secondary"
                          }
                          className="mt-0.5"
                        >
                          {booking.status}
                        </Badge>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent leads</CardTitle>
          </CardHeader>
          <CardContent>
            {leadList.length === 0 ? (
              <p className="text-sm text-muted-foreground">No leads yet.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {leadList.map((lead) => (
                  <li key={lead.id}>
                    <Link
                      href={`${ROUTES.dashboard.crm}/leads/${lead.id}`}
                      className="flex items-center justify-between gap-3 rounded-md border p-2 hover:bg-muted/50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {(lead.contact_id && names.get(lead.contact_id)) ||
                            "Lead"}
                        </span>
                        <span className="text-xs capitalize text-muted-foreground">
                          {lead.type} · {lead.status}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
