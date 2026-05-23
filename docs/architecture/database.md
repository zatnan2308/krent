# База данных

Krent работает на Supabase Postgres 17. Схема разделена по доменам, каждый
получает свою миграцию (`supabase/migrations/…`). Описание ниже отражает
текущее состояние ЭТАПов 1-19.

## Базовые таблицы

| Группа | Таблицы |
| --- | --- |
| **Core** | `organizations`, `organization_members`, `roles`, `permissions`, `role_permissions`, `modules`, `organization_modules`, `audit_logs`, `licenses`, `domains` |
| **CMS** | `pages`, `page_blocks`, `navigation_menus`, `navigation_items`, `redirects` |
| **Properties** | `properties`, `property_translations`, `property_prices`, `property_locations`, `property_amenities`, `property_media`, `property_videos`, `property_documents`, `amenities`, `amenity_categories` |
| **CRM** | `contacts`, `leads`, `lead_attribution`, `deals`, `deal_stages`, `tasks`, `notes` |
| **Portals** | `portal_accounts` |
| **Chat** | `conversations`, `messages`, `message_reads`, `chat_attachments` |
| **Calendar** | `rental_calendars`, `rental_calendar_events`, `ical_sources`, `ical_sync_logs` |
| **Bookings & payments** | `rental_bookings`, `rental_fees`, `rental_guests`, `payment_providers`, `payment_transactions`, `payment_refunds`, `payment_payouts` |
| **Notifications** | `notification_templates`, `notification_events`, `notification_logs`, `email_sends` |
| **Campaigns** | `campaigns`, `campaign_blocks`, `campaign_recipients`, `campaign_reports`, `segments`, `unsubscribes`, `marketing_consents`, `email_lists`, `email_list_members` |
| **SEO** | `seo_settings`, `area_pages`, `redirects` |
| **Analytics** | `analytics_events`, `analytics_sessions`, `analytics_consents`, `analytics_tracking_settings` |
| **Integrations** | `integration_connections`, `integration_tokens`, `google_search_console_connections`, `google_ads_connections`, `meta_ads_connections`, `seo_reports`, `seo_opportunities`, `ad_campaign_reports` |
| **Agency API** | `agent_website_connections`, `api_keys`, `api_scopes`, `api_usage_logs`, `api_rate_limits`, `external_domains`, `webhook_endpoints`, `webhook_events`, `webhook_delivery_logs`, `property_sync_settings`, `property_external_visibility`, `agent_feed_settings` |
| **Platform** | `platform_admins` |

## Конвенции

- **PK = `id uuid` default `gen_random_uuid()`**, кроме join-таблиц и одно-к-одно
  настроек, где PK — естественный ключ.
- **`organization_id uuid not null`** на всех бизнес-таблицах, FK на
  `organizations(id) on delete cascade`. Это база для RLS.
- **`created_at` / `updated_at`** обычно `timestamptz not null default now()`.
  Триггер `set_updated_at()` обновляет `updated_at` на каждом UPDATE.
- Все enum'ы созданы через `create type X as enum (...)` и доступны в TS
  через `Enums<"X">`.

## RLS

См. [permissions.md](permissions.md). Кратко:

- На каждой бизнес-таблице `alter table ... enable row level security`.
- SELECT-политика: `using (app_private.has_permission(organization_id, '<permission_key>'))`.
- INSERT/UPDATE/DELETE — через service-клиент в server actions и API после
  ручной проверки прав. RLS даёт defense-in-depth для select.
- Системные каталоги (`modules`, `permissions`, `roles`, `api_scopes`,
  `notification_templates` базовые) → `using (true)` для select.

## Helper-функции

| Функция | Что делает |
| --- | --- |
| `app_private.has_permission(org_id uuid, perm text)` | проверяет, есть ли у текущего auth.uid() право |
| `set_updated_at()` | trigger, обновляет `updated_at` при UPDATE |
| `current_user_id()` | обёртка над `auth.uid()` для public-вызова |

## Хранение чувствительных данных

- API-ключи: храним только `sha256` хеш (`api_keys.key_hash`) + видимый
  префикс. Сырой ключ выдаётся одноразово.
- OAuth-токены интеграций: `integration_tokens.access_token` зашифрован через
  `lib/encryption` (текущая реализация — placeholder, готов для AES-GCM).
- Webhook secret'ы: хранятся в `webhook_endpoints.secret` плейн-текстом
  внутри организации; для production рекомендуется зашифровать аналогично
  токенам интеграций.

## Многоязычность

Сущности, имеющие переводимый контент, выделяют таблицу `_translations`:
`property_translations`, `cms_page_translations` и т.д. Default-язык в
`organizations.default_language`.

## Регенерация типов

```bash
# через MCP / Supabase CLI
node scripts/write-types.js <input.json> src/types/database.ts
```

`src/types/database.ts` — авто-сгенерированный. Никогда не правьте его руками.
