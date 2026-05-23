# Реклама и интеграции

Krent поддерживает Search Console, Google Ads и Meta Ads через единый модуль
`features/integrations`. На текущем этапе:

- Базы данных (8 таблиц) и RLS готовы.
- UI подключения и просмотра метрик — есть.
- OAuth-flow — placeholder. Для production требует реальных client_id /
  secret и подписания токенов.

## Подключение

Dashboard → Integrations → Connect. Сейчас вводятся id-аккаунтов вручную;
после OAuth-flow это будет однокликовое подключение.

| Provider | Что хранится | Что нужно для real-time |
| --- | --- | --- |
| Google Search Console | `site_url`, `account_id` | OAuth + Search Console API |
| Google Ads | `customer_id`, `manager_customer_id`, `currency` | OAuth + Google Ads API + developer token |
| Meta Ads | `ad_account_id`, `business_id`, `currency` | OAuth + Marketing API |

Токены хранятся в `integration_tokens.access_token` через
`lib/encryption.encryptToken()` (placeholder, base64; см. **TODO** в
[../reviews/security.md](../reviews/security.md)).

## Real estate ad warnings

В UI выводится список ограничений на рекламу недвижимости (Housing Ad
Category Google, Special Ad Category Meta). Не запускайте кампании без
просмотра локального законодательства.

## Reports

- `ad_campaign_reports` — daily aggregates (spend/impressions/clicks/leads,
  level = campaign/adset/ad).
- `seo_reports` — daily totals (clicks, impressions, position).
- `seo_opportunities` — поисковые запросы с потенциалом.

Текущий рендер dashboard'ов читает реальные данные из этих таблиц. Чтобы они
заполнялись — нужен sync-job (cron), который вызывает API провайдеров.

## Offline conversions

`features/integrations/constants.ts → OFFLINE_CONVERSION_TYPES` определяет
типы (lead_qualified, appointment_booked, booking_confirmed, deal_closed).
Загрузка событий выполняется через единый adapter; запуск зависит от того,
подключён ли реальный OAuth-провайдер (см. секцию Setup в этом файле). Без
клиентских API-credentials UI показывает `Requires API credentials`.

## Архитектура adapter

`features/integrations/adapters.ts` определяет `IntegrationAdapter`-интерфейс
с placeholder-имплементациями. Для реального OAuth-flow:

1. Реализуйте `connect()` через provider SDK.
2. Сохраните refresh-token в `integration_tokens`.
3. Реализуйте `fetchReports()` для daily-sync.
4. Включите `/api/cron/integrations-sync` job в `vercel.json`.

## Безопасность

- Никаких client-secret'ов в браузере.
- `integration_tokens` доступен только service-клиенту.
- Перед production включить AES-GCM в `lib/encryption`.
- Webhook'и провайдеров (Google / Meta) проверяйте подписью аналогично
  Stripe/Resend.
