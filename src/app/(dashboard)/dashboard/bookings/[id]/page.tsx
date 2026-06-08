import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Download } from "lucide-react";

import { BookingManager } from "@/features/bookings/booking-manager";
import {
  BOOKING_PAYMENT_STATUS_LABELS,
  BOOKING_SOURCE_LABELS,
  BOOKING_STATUS_BADGE,
  BOOKING_STATUS_LABELS,
} from "@/features/bookings/constants";
import { getBookingDetail } from "@/features/bookings/queries";
import {
  PAYMENT_PROVIDER_LABELS,
  PAYMENT_STATUS_LABELS,
  REFUND_STATUS_LABELS,
} from "@/features/payments/constants";
import { BookingWhatsAppButton } from "@/features/messaging/booking-whatsapp-button";
import { getWhatsAppConfig } from "@/features/messaging/config";
import { ContactChannels } from "@/features/messaging/contact-channels";
import { getContactChannels } from "@/features/messaging/queries";
import { getBookingPaymentData } from "@/features/payments/queries";
import { formatDateDisplay } from "@/features/rental-calendar/date-utils";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ROUTES } from "@/lib/constants/routes";
import { getServerDictionary } from "@/lib/i18n/runtime";
import { requireOrganizationContext } from "@/server/organization-context";
import { hasPermission } from "@/server/permissions";

export const metadata: Metadata = {
  title: "Booking",
};

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

export default async function BookingDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const context = await requireOrganizationContext();
  if (!context.organization) {
    return null;
  }
  if (!hasPermission(context, "bookings.view")) {
    redirect(ROUTES.dashboard.root);
  }

  const detail = await getBookingDetail(context.organization.id, params.id);
  if (!detail) {
    notFound();
  }
  const { booking, property, contact, fees, guests } = detail;

  const canViewPayments = hasPermission(context, "payments.view");
  const paymentData = canViewPayments
    ? await getBookingPaymentData(context.organization.id, params.id)
    : { payments: [], transactions: [], refunds: [] };
  const bookingChannels = contact
    ? await getContactChannels(context.organization.id, contact.id)
    : [];
  const waConfig = getWhatsAppConfig();
  const canSendBookingWhatsApp = Boolean(
    waConfig?.bookingTemplate &&
      booking.guest_phone &&
      hasPermission(context, "bookings.manage"),
  );

  const dict = await getServerDictionary();
  const t = dict.dashBookings;

  const stayRows: { label: string; value: string }[] = [
    { label: t.checkIn, value: formatDateDisplay(booking.check_in) },
    { label: t.checkOut, value: formatDateDisplay(booking.check_out) },
    { label: t.nightsLabel, value: String(booking.nights) },
    {
      label: t.guests,
      value: t.guestsValue
        .replace("{adults}", String(booking.adults))
        .replace("{children}", String(booking.children))
        .replace("{pets}", String(booking.pets)),
    },
    { label: t.source, value: BOOKING_SOURCE_LABELS[booking.source] },
    {
      label: t.created,
      value: new Date(booking.created_at).toLocaleString("en-US"),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: dict.adminNav.bookings, href: ROUTES.dashboard.bookings },
          { label: booking.reference },
        ]}
        title={booking.reference}
        actions={
          <>
            <Badge variant={BOOKING_STATUS_BADGE[booking.status]}>
              {BOOKING_STATUS_LABELS[booking.status]}
            </Badge>
            <Badge variant="outline">
              {BOOKING_PAYMENT_STATUS_LABELS[booking.payment_status]}
            </Badge>
          </>
        }
      />
      {property ? (
        <p className="-mt-3 text-sm text-muted-foreground">
          <Link
            href={`${ROUTES.dashboard.properties}/${property.id}`}
            className="hover:underline"
          >
            {property.title}
          </Link>
          {" · "}
          <Link
            href={`${ROUTES.dashboard.properties}/${property.id}/calendar`}
            className="hover:underline"
          >
            {t.calendar}
          </Link>
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.stayDetails}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              {stayRows.map((row) => (
                <div key={row.label} className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{row.label}</dt>
                  <dd className="text-right font-medium">{row.value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.guest}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-medium">
              {booking.guest_name ?? contact?.full_name ?? t.guestFallback}
            </p>
            {booking.guest_email ? (
              <p className="text-muted-foreground">{booking.guest_email}</p>
            ) : null}
            {booking.guest_phone ? (
              <p className="text-muted-foreground">{booking.guest_phone}</p>
            ) : null}
            {contact ? (
              <Link
                href={`${ROUTES.dashboard.crmContacts}/${contact.id}`}
                className="block pt-1 text-primary hover:underline"
              >
                {t.openContact}
              </Link>
            ) : null}
            {booking.lead_id ? (
              <Link
                href={`${ROUTES.dashboard.crmLeads}/${booking.lead_id}`}
                className="block text-primary hover:underline"
              >
                {t.openLead}
              </Link>
            ) : null}
            {booking.guest_message ? (
              <p className="border-t pt-2 text-muted-foreground">
                {booking.guest_message}
              </p>
            ) : null}
            {guests.length > 0 ? (
              <p className="border-t pt-2 text-xs text-muted-foreground">
                {t.guestRecords.replace("{n}", String(guests.length))}
              </p>
            ) : null}
            {bookingChannels.length > 0 ? (
              <div className="border-t pt-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  {t.messaging}
                </p>
                <ContactChannels channels={bookingChannels} />
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.manage}</CardTitle>
          </CardHeader>
          <CardContent>
            <BookingManager
              bookingId={booking.id}
              status={booking.status}
              paymentStatus={booking.payment_status}
              total={booking.total}
              canManageBookings={hasPermission(context, "bookings.manage")}
              canManagePayments={hasPermission(context, "payments.manage")}
            />
            {canSendBookingWhatsApp ? (
              <div className="mt-3 border-t pt-3">
                <BookingWhatsAppButton bookingId={booking.id} />
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-base">{t.priceBreakdown}</CardTitle>
          <div className="flex items-center gap-3 text-sm">
            <Link
              href={`${ROUTES.dashboard.bookings}/${booking.id}/invoice`}
              className="text-primary hover:underline"
            >
              {t.invoice}
            </Link>
            <a
              href={`${ROUTES.dashboard.bookings}/${booking.id}/invoice/pdf`}
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              <Download className="h-3.5 w-3.5" />
              PDF
            </a>
          </div>
        </CardHeader>
        <CardContent>
          {fees.length > 0 ? (
            <ul className="divide-y text-sm">
              {fees.map((fee) => (
                <li
                  key={fee.id}
                  className="flex justify-between gap-3 py-2"
                >
                  <span className="text-muted-foreground">{fee.label}</span>
                  <span className="font-medium">
                    {formatMoney(fee.amount, fee.currency)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t.noFeeBreakdown}
            </p>
          )}
          <div className="mt-3 flex justify-between border-t pt-3 text-sm font-semibold">
            <span>{t.total}</span>
            <span>{formatMoney(booking.total, booking.currency)}</span>
          </div>
          {booking.security_deposit > 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {t.refundableDeposit}{" "}
              {formatMoney(booking.security_deposit, booking.currency)}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {canViewPayments ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.paymentsRefunds}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium">{t.payments}</p>
              {paymentData.payments.length > 0 ? (
                <ul className="divide-y rounded-md border text-sm">
                  {paymentData.payments.map((payment) => (
                    <li
                      key={payment.id}
                      className="flex justify-between gap-3 p-2.5"
                    >
                      <span>
                        {PAYMENT_PROVIDER_LABELS[payment.provider]}
                        {payment.is_manual ? ` · ${t.manual}` : ""}
                        <span className="block text-xs text-muted-foreground">
                          {new Date(payment.created_at).toLocaleString(
                            "en-US",
                          )}
                        </span>
                      </span>
                      <span className="text-right">
                        {formatMoney(payment.amount, payment.currency)}
                        <span className="block text-xs text-muted-foreground">
                          {PAYMENT_STATUS_LABELS[payment.status]}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t.noPayments}
                </p>
              )}
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">{t.refunds}</p>
              {paymentData.refunds.length > 0 ? (
                <ul className="divide-y rounded-md border text-sm">
                  {paymentData.refunds.map((refund) => (
                    <li
                      key={refund.id}
                      className="flex justify-between gap-3 p-2.5"
                    >
                      <span>
                        {PAYMENT_PROVIDER_LABELS[refund.provider]}
                        {refund.reason ? (
                          <span className="block text-xs text-muted-foreground">
                            {refund.reason}
                          </span>
                        ) : null}
                      </span>
                      <span className="text-right">
                        {formatMoney(refund.amount, refund.currency)}
                        <span className="block text-xs text-muted-foreground">
                          {REFUND_STATUS_LABELS[refund.status]}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t.noRefunds}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
