/** Каталог типов событий аналитики. */
export const ANALYTICS_EVENT_TYPES = [
  "page_view",
  "property_view",
  "property_photo_view",
  "property_video_view",
  "property_map_open",
  "property_share",
  "property_favorite",
  "search_performed",
  "filter_used",
  "lead_form_start",
  "lead_form_submit",
  "seller_valuation_start",
  "seller_valuation_submit",
  "book_showing_click",
  "book_showing_submit",
  "call_click",
  "email_click",
  "whatsapp_click",
  "chat_started",
  "booking_dates_selected",
  "booking_started",
  "booking_completed",
  "payment_started",
  "payment_completed",
  "document_download",
] as const;

export type AnalyticsEventType = (typeof ANALYTICS_EVENT_TYPES)[number];

/** UTM и click ID, которые мы фиксируем при заходе на сайт. */
export const UTM_PARAM_NAMES = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "gclid",
  "gbraid",
  "wbraid",
  "fbclid",
  "fbc",
  "fbp",
] as const;

export type UtmParamName = (typeof UTM_PARAM_NAMES)[number];

/**
 * Сопоставление наших событий стандартным событиям Meta Pixel.
 * События, отсутствующие в карте, отправляются как trackCustom.
 */
export const META_PIXEL_STANDARD: Record<string, string> = {
  property_view: "ViewContent",
  search_performed: "Search",
  lead_form_submit: "Lead",
  booking_started: "InitiateCheckout",
  payment_started: "AddPaymentInfo",
  payment_completed: "Purchase",
};
