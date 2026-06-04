import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  BOOKING_PAYMENT_STATUS_LABELS,
  BOOKING_SOURCE_LABELS,
  BOOKING_STATUS_BADGE,
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_OPTIONS,
} from "@/features/bookings/constants";
import { listBookings } from "@/features/bookings/queries";
import type { BookingSource, BookingStatus } from "@/features/bookings/types";
import { PaymentSettings } from "@/features/payments/payment-settings";
import { getPaymentSettings } from "@/features/payments/queries";
import { formatDateDisplay } from "@/features/rental-calendar/date-utils";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ROUTES } from "@/lib/constants/routes";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

export const metadata: Metadata = {
  title: "Bookings",
};

export const dynamic = "force-dynamic";

const FIELD_CLASS =
  "flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function parseStatus(value: string | undefined): BookingStatus | undefined {
  return BOOKING_STATUS_OPTIONS.some((option) => option.value === value)
    ? (value as BookingStatus)
    : undefined;
}

function parseSource(value: string | undefined): BookingSource | undefined {
  return value &&
    Object.prototype.hasOwnProperty.call(BOOKING_SOURCE_LABELS, value)
    ? (value as BookingSource)
    : undefined;
}

/** Денежное форматирование с устойчивостью к произвольному коду валюты. */
function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return null;
  }
  if (!hasPermission(context, "bookings.view")) {
    redirect(ROUTES.dashboard.root);
  }

  const q = typeof searchParams.q === "string" ? searchParams.q : "";
  const status = parseStatus(
    typeof searchParams.status === "string" ? searchParams.status : undefined,
  );
  const source = parseSource(
    typeof searchParams.source === "string" ? searchParams.source : undefined,
  );
  const pageParam = Number(
    typeof searchParams.page === "string" ? searchParams.page : "1",
  );
  const requestedPage =
    Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;

  const {
    items: bookings,
    total,
    pageSize,
  } = await listBookings(context.organization.id, {
    ...(status ? { status } : {}),
    ...(source ? { source } : {}),
    ...(q ? { q } : {}),
    page: requestedPage,
  });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);

  // Сохраняем активные фильтры при переходе между страницами.
  const buildPageHref = (target: number): string => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (source) params.set("source", source);
    if (target > 1) params.set("page", String(target));
    const qs = params.toString();
    return qs ? `${ROUTES.dashboard.bookings}?${qs}` : ROUTES.dashboard.bookings;
  };

  const canViewPayments = hasPermission(context, "payments.view");
  const canManagePayments = hasPermission(context, "payments.manage");
  const paymentSettings = canViewPayments
    ? await getPaymentSettings(context.organization.id)
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Bookings</h1>
        <p className="text-sm text-muted-foreground">
          Direct booking requests and online payments from your website.
        </p>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <label htmlFor="q" className="text-sm font-medium">
            Search
          </label>
          <input
            id="q"
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Reference, guest name, email or phone…"
            className={`${FIELD_CLASS} w-72`}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="status" className="text-sm font-medium">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={status ?? ""}
            className={`${FIELD_CLASS} w-48`}
          >
            <option value="">All statuses</option>
            {BOOKING_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="source" className="text-sm font-medium">
            Source
          </label>
          <select
            id="source"
            name="source"
            defaultValue={source ?? ""}
            className={`${FIELD_CLASS} w-48`}
          >
            <option value="">All sources</option>
            {Object.entries(BOOKING_SOURCE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className={buttonVariants({ variant: "outline" })}
        >
          Filter
        </button>
      </form>

      {bookings.length > 0 ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {total} booking{total === 1 ? "" : "s"}
            {totalPages > 1 ? ` · page ${page} of ${totalPages}` : ""}
          </p>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Guest</TableHead>
                  <TableHead>Stay</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`${ROUTES.dashboard.bookings}/${booking.id}`}
                        className="hover:underline"
                      >
                        {booking.reference}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {booking.propertyTitle}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {booking.guestName}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateDisplay(booking.checkIn)} &rarr;{" "}
                      {formatDateDisplay(booking.checkOut)}
                      <span className="block text-xs">
                        {booking.nights} night(s)
                      </span>
                    </TableCell>
                    <TableCell>
                      {formatMoney(booking.total, booking.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={BOOKING_STATUS_BADGE[booking.status]}>
                        {BOOKING_STATUS_LABELS[booking.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {BOOKING_PAYMENT_STATUS_LABELS[booking.paymentStatus]}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {BOOKING_SOURCE_LABELS[booking.source]}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            getHref={buildPageHref}
          />
        </div>
      ) : (
        <EmptyState
          title="No bookings found"
          description={
            q || status || source
              ? "No bookings match your filters. Try clearing the search."
              : "Booking requests from your website will appear here."
          }
        />
      )}

      {canViewPayments ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment providers</CardTitle>
          </CardHeader>
          <CardContent>
            <PaymentSettings
              settings={paymentSettings}
              canManage={canManagePayments}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
