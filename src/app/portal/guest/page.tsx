import type { Metadata } from "next";
import Link from "next/link";

import { PortalDocuments } from "@/features/portal/portal-documents";
import {
  getGuestPortalData,
  getPortalAccount,
  listPortalDocuments,
  type GuestBooking,
} from "@/features/portal/queries";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { DEFAULT_CURRENCY, isCurrencyCode } from "@/lib/currency/config";
import { formatCurrency } from "@/lib/currency/format";

export const metadata: Metadata = {
  title: "Guest portal",
};

function fmtDate(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
}

export default async function GuestPortalPage() {
  const resolved = await getPortalAccount("guest");
  if (!resolved) {
    return (
      <EmptyState
        title="No guest portal access"
        description="This account is not linked to a guest portal."
      />
    );
  }

  const data = await getGuestPortalData(resolved.account);
  const documents = await listPortalDocuments(resolved.account);
  const locale = resolved.organization.default_language;
  const now = Date.now();
  const isUpcoming = (b: GuestBooking) =>
    b.status !== "cancelled" && new Date(b.checkOut).getTime() >= now;
  const upcoming = data.bookings.filter(isUpcoming);
  const history = data.bookings.filter((b) => !isUpcoming(b));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Guest portal</h1>
        <p className="text-sm text-muted-foreground">
          {resolved.organization.name}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upcoming stays</CardTitle>
        </CardHeader>
        <CardContent>
          {upcoming.length > 0 ? (
            <BookingList bookings={upcoming} locale={locale} />
          ) : (
            <p className="text-sm text-muted-foreground">
              You have no upcoming stays.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Booking history</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length > 0 ? (
            <BookingList bookings={history} locale={locale} />
          ) : (
            <p className="text-sm text-muted-foreground">
              No past or cancelled bookings.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <PortalDocuments documents={documents} />
        </CardContent>
      </Card>
    </div>
  );
}

function BookingList({
  bookings,
  locale,
}: {
  bookings: GuestBooking[];
  locale: string;
}) {
  return (
    <ul className="divide-y">
      {bookings.map((booking) => (
        <BookingRow key={booking.id} booking={booking} locale={locale} />
      ))}
    </ul>
  );
}

function BookingRow({
  booking,
  locale,
}: {
  booking: GuestBooking;
  locale: string;
}) {
  const currency = isCurrencyCode(booking.currency)
    ? booking.currency
    : DEFAULT_CURRENCY;
  return (
    <li className="flex items-start justify-between gap-3 py-3">
      <div className="min-w-0">
        {booking.propertySlug ? (
          <Link
            href={`/${locale}/properties/${booking.propertySlug}`}
            className="text-sm font-medium hover:underline"
          >
            {booking.propertyTitle}
          </Link>
        ) : (
          <span className="text-sm font-medium">{booking.propertyTitle}</span>
        )}
        <p className="text-xs text-muted-foreground">
          {fmtDate(booking.checkIn)} → {fmtDate(booking.checkOut)} ·{" "}
          {booking.nights} nights · {booking.guests} guests
        </p>
        <p className="text-xs text-muted-foreground">Ref {booking.reference}</p>
      </div>
      <div className="shrink-0 space-y-1 text-right">
        <p className="text-sm font-medium">
          {formatCurrency(booking.total, currency, "en")}
        </p>
        <Badge
          variant={
            booking.status === "cancelled"
              ? "destructive"
              : booking.paymentStatus === "paid"
                ? "secondary"
                : "outline"
          }
        >
          {booking.status === "cancelled"
            ? "cancelled"
            : booking.paymentStatus.replace(/_/g, " ")}
        </Badge>
      </div>
    </li>
  );
}
