import type {
  EmailSendStatus,
  NotificationDeliveryStatus,
  NotificationEventStatus,
} from "./types";

/** Переменные, поддерживаемые шаблонизатором писем. */
export const TEMPLATE_VARIABLES = [
  "first_name",
  "agent_name",
  "property_title",
  "property_url",
  "appointment_date",
  "booking_checkin",
  "booking_checkout",
  "company_name",
] as const;

export const EMAIL_SEND_STATUS_LABELS: Record<EmailSendStatus, string> = {
  queued: "Queued",
  sent: "Sent",
  failed: "Failed",
};

export const DELIVERY_STATUS_LABELS: Record<
  NotificationDeliveryStatus,
  string
> = {
  sent: "Sent",
  skipped: "Skipped",
  failed: "Failed",
};

export const EVENT_STATUS_LABELS: Record<NotificationEventStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  processed: "Processed",
  failed: "Failed",
};
