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
import { PageHeader } from "@/components/ui/page-header";
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
import { getServerDictionary } from "@/lib/i18n/runtime";
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
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  const checkInFrom =
    typeof searchParams.from === "string" && datePattern.test(searchParams.from)
      ? searchParams.from
      : "";
  const checkInTo =
    typeof searchParams.to === "string" && datePattern.test(searchParams.to)
      ? searchParams.to
      : "";
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
    ...(checkInFrom ? { checkInFrom } : {}),
    ...(checkInTo ? { checkInTo } : {}),
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
    if (checkInFrom) params.set("from", checkInFrom);
    if (checkInTo) params.set("to", checkInTo);
    if (target > 1) params.set("page", String(target));
    const qs = params.toString();
    return qs ? `${ROUTES.dashboard.bookings}?${qs}` : ROUTES.dashboard.bookings;
  };

  const canViewPayments = hasPermission(context, "payments.view");
  const canManagePayments = hasPermission(context, "payments.manage");
  const paymentSettings = canViewPayments
    ? await getPaymentSettings(context.organization.id)
    : [];
  const dict = await getServerDictionary();
  const t = dict.dashBookings;

  return (
    <div className="space-y-6">
      <PageHeader
        title={dict.adminNav.bookings}
        description={t.description}
      />

      <form
        method="get"
        className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4 shadow-sm"
      >
        <div className="space-y-1.5">
          <label htmlFor="q" className="text-sm font-medium">
            {t.search}
          </label>
          <input
            id="q"
            type="search"
            name="q"
            defaultValue={q}
            placeholder={t.searchPlaceholder}
            className={`${FIELD_CLASS} w-72`}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="status" className="text-sm font-medium">
            {t.status}
          </label>
          <select
            id="status"
            name="status"
            defaultValue={status ?? ""}
            className={`${FIELD_CLASS} w-48`}
          >
            <option value="">{t.allStatuses}</option>
            {BOOKING_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="source" className="text-sm font-medium">
            {t.source}
          </label>
          <select
            id="source"
            name="source"
            defaultValue={source ?? ""}
            className={`${FIELD_CLASS} w-48`}
          >
            <option value="">{t.allSources}</option>
            {Object.entries(BOOKING_SOURCE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="from" className="text-sm font-medium">
            {t.checkInFrom}
          </label>
          <input
            id="from"
            type="date"
            name="from"
            defaultValue={checkInFrom}
            className={`${FIELD_CLASS} w-44`}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="to" className="text-sm font-medium">
            {t.checkInTo}
          </label>
          <input
            id="to"
            type="date"
            name="to"
            defaultValue={checkInTo}
            className={`${FIELD_CLASS} w-44`}
          />
        </div>
        <button
          type="submit"
          className={buttonVariants({ variant: "outline" })}
        >
          {t.filter}
        </button>
      </form>

      {bookings.length > 0 ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t.bookingsCount.replace("{n}", String(total))}
            {totalPages > 1
              ? ` · ${t.pageOf
                  .replace("{page}", String(page))
                  .replace("{total}", String(totalPages))}`
              : ""}
          </p>
          <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.colReference}</TableHead>
                  <TableHead>{t.colProperty}</TableHead>
                  <TableHead>{t.colGuest}</TableHead>
                  <TableHead>{t.colStay}</TableHead>
                  <TableHead>{t.colTotal}</TableHead>
                  <TableHead>{t.colStatus}</TableHead>
                  <TableHead>{t.colPayment}</TableHead>
                  <TableHead>{t.colSource}</TableHead>
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
                        {t.nights.replace("{n}", String(booking.nights))}
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
          title={t.emptyTitle}
          description={
            q || status || source || checkInFrom || checkInTo
              ? t.emptyFiltered
              : t.emptyDefault
          }
        />
      )}

      {canViewPayments ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.paymentProviders}</CardTitle>
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
