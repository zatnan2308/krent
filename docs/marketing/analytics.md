# Analytics

Krent имеет собственный лёгкий tracker и интеграцию с GA4 / GTM / Meta Pixel.
Все события привязаны к организации.

## Модель

- `analytics_events` — фактические события (event_type, payload, lead_id,
  property_id, user_id, session_id, occurred_at).
- `analytics_sessions` — UTM/source/medium на уровне сессии.
- `analytics_consents` — статус cookie-consent посетителя.
- `analytics_tracking_settings` — настройки tenant'а: ga4_measurement_id,
  gtm_container_id, meta_pixel_id, consent_mode.

## Запись событий

Frontend: `track(event, payload)` из `src/features/analytics/track.ts`.
Под капотом — POST на `/api/analytics/event`, который пишет в
`analytics_events` через service-клиент.

Готовый список ключевых событий (24 шт.): `page_view`, `property_view`,
`lead_form_view`, `lead_form_submit`, `booking_started`, `booking_completed`,
`payment_started`, `payment_completed`, `phone_click`, `email_click`,
`chat_open`, `chat_message_sent`, `share_click`, `save_property`,
`apply_filter`, `search_submit`, … (см. `features/analytics/constants.ts`).

## GA4 / GTM / Pixel

Если в `analytics_tracking_settings` заполнены ID, Krent инжектит
соответствующие скрипты через `next/script` в публичный layout. Consent
обрабатывается заглушкой — для production включите GA4 Consent Mode v2
(переменные `default_consent` в `tracker.tsx`).

## Дашборд

`/dashboard/analytics` — server component, агрегирует:

- Totals по событиям за последние 14 дней.
- Top properties по `property_view`.
- Conversion funnel: form_view → form_submit → lead.

## Multi-tenant attribution

UTM-параметры читаются на стороне клиента, передаются в `/api/analytics/event`
и сохраняются в `analytics_sessions`. На уровне CRM лида атрибуция
дублируется в `lead_attribution` (см. `features/crm/attribution.ts`).

## Privacy

- `analytics_consents` фиксирует выбор пользователя.
- `track()` уважает выбор: если consent withdrawn, событие отправляется,
  но `gtag('consent', 'update', ...)` ставит `analytics_storage: 'denied'`.
- IP-адреса не хранятся в `analytics_events` (только в `api_usage_logs`,
  который доступен только админу).

## Best practices

- Не используйте `analytics_events` для биллинговой телеметрии — она eventually
  consistent и может содержать дубли.
- Для production добавьте edge-rate-limit на `/api/analytics/event`, чтобы
  блокировать ботов.
- Раз в месяц чистите старые `analytics_events` (`> 13 месяцев`) — иначе
  таблица растёт.
