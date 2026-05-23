import type {
  BookingPaymentStatus,
  BookingSource,
  BookingStatus,
  RentalFeeKind,
} from "./types";

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  draft: "Draft",
  pending: "Pending",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  completed: "Completed",
};

export const BOOKING_SOURCE_LABELS: Record<BookingSource, string> = {
  website: "Website",
  agent: "Agent",
  airbnb_import: "Airbnb import",
  booking_import: "Booking.com import",
};

export const BOOKING_PAYMENT_STATUS_LABELS: Record<
  BookingPaymentStatus,
  string
> = {
  unpaid: "Unpaid",
  partially_paid: "Partially paid",
  paid: "Paid",
  refunded: "Refunded",
  partially_refunded: "Partially refunded",
};

export const RENTAL_FEE_KIND_LABELS: Record<RentalFeeKind, string> = {
  accommodation: "Accommodation",
  cleaning: "Cleaning fee",
  security_deposit: "Security deposit",
  tax: "Taxes",
  discount: "Discount",
  service: "Service fee",
  other: "Other",
};

/** Цвет бейджа статуса бронирования. */
export const BOOKING_STATUS_BADGE: Record<
  BookingStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  draft: "outline",
  pending: "secondary",
  confirmed: "default",
  cancelled: "destructive",
  completed: "outline",
};

/** Статусы бронирования для фильтра в dashboard. */
export const BOOKING_STATUS_OPTIONS: { value: BookingStatus; label: string }[] =
  [
    { value: "pending", label: "Pending" },
    { value: "confirmed", label: "Confirmed" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
    { value: "draft", label: "Draft" },
  ];
