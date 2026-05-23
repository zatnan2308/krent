import type { Enums, Tables } from "@/types/database";

// ---- Алиасы строк таблиц Notification Center -------------------
export type NotificationTemplate = Tables<"notification_templates">;
export type EmailTemplate = Tables<"email_templates">;
export type NotificationPreference = Tables<"notification_preferences">;
export type NotificationEvent = Tables<"notification_events">;
export type NotificationLog = Tables<"notification_logs">;
export type EmailSend = Tables<"email_sends">;
export type EmailBounce = Tables<"email_bounces">;
export type EmailComplaint = Tables<"email_complaints">;

// ---- Алиасы enum-типов ----------------------------------------
export type NotificationEventStatus = Enums<"notification_event_status">;
export type NotificationDeliveryStatus =
  Enums<"notification_delivery_status">;
export type EmailSendStatus = Enums<"email_send_status">;
