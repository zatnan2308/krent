# Security review (ЭТАП 20)

## 1. RLS

- Все бизнес-таблицы помечены `enable row level security` (миграции по
  модулям). Supabase advisor → security возвращает `0 lints`.
- SELECT-политики используют `app_private.has_permission(organization_id,
  '<key>')`, что соединяет `organization_members` × `role_permissions`.
- Системные каталоги (`modules`, `permissions`, `roles`, `api_scopes`,
  системные `notification_templates`) → `using (true)` для select.
- INSERT/UPDATE/DELETE — через `createAdminClient()` (service-role) после
  явной проверки прав в server actions. Никаких прямых публичных мутаций
  через anon-клиент.

## 2. Server-side permission checks

- Каждое server action начинается с `requireOrganizationContext()` +
  `hasPermission(context, '<key>')`. Если право отсутствует — возврат
  `{ ok: false, error }` и **никаких** записей в БД.
- Public API (Agency API): `requireApiAuth(request, scope)` валидирует
  ключ, scope, allowed_domains, rate_limit; неудачные попытки логируются в
  `api_usage_logs` со статусом 401/403/429.
- Super Admin: `requireSuperAdmin()` проверяет `platform_admins`.

## 3. API keys

- Генерация: `randomBytes(32)` → hex, префикс `krent_sk_`.
- Хранение: `sha256` хеш и видимый префикс. Сырой ключ показывается один
  раз в UI.
- Сравнение: `crypto.timingSafeEqual` для защиты от timing-атак.
- Каждый ключ ограничен `scopes`, `allowed_domains`, `rate_limit_per_minute`
  и опционально `agent_id`.
- Revoke: ставит `status='revoked'` + `revoked_at`, после чего auth flow
  возвращает 401.

## 4. Upload security

- Bucket `property-media`: MIME-фильтр на сервере (`image/jpeg|png|webp|avif`),
  лимит 10 MB, имя файла генерируется через `crypto.randomUUID()`, путь
  включает `organizationId`.
- Загрузка идёт через service-клиент (`admin.storage.from(...).upload`), сама
  строка `property_media` — через anon-клиент с RLS.
- При ошибке вставки строки осиротевший файл удаляется (rollback).
- В чате `chat-attachments`: подписанные URL, доступ ограничен RLS на
  conversation.

## 5. Private files

- Bucket `chat-attachments` — приватный, доступ через подписанный URL.
- `property_documents` (PDF брошюры) — для приватных файлов выдача идёт
  через подписанные URL (см. `features/properties/document-access.ts`),
  публичные ссылки используются только для общих брошюр, помеченных
  `type = "brochure"` и `is_public = true`.
- Storage policies не разрешают anonymous SELECT — всё через server actions.

## 6. External API access

- `STRIPE_SECRET_KEY`, `PAYPAL_CLIENT_SECRET`, `RESEND_API_KEY` доступны
  только через `getServerEnv()`. Помечены в `lib/env.ts` как server-only.
- В клиентских компонентах используются только `NEXT_PUBLIC_*` переменные.
- Все провайдер-секреты загружаются ленivo (`getServerEnv()` бросает, если
  переменная пуста и реально нужна).

## 7. Domain restrictions

- `api_keys.allowed_domains` — белый список origin'ов (поддерживает wildcard
  `*.example.com`).
- `requireApiAuth` извлекает `Origin` (или `Host` для server-to-server) и
  валидирует против списка. Несовпадение → 403.
- Custom domain → tenant резолв происходит только из `domains.status =
  'verified'`. Pending-домены не получают доступа к данным.

## 8. Webhook signing

- Внутренние webhook'и (Stripe, PayPal, Resend) проверяют подписи через
  соответствующие SDK или ручной HMAC.
- Исходящие webhook'и (Agency API → сайты агентов) подписываются
  HMAC-SHA256 над JSON-body, ключ — `webhook_endpoints.secret`. Подпись в
  заголовке `x-krent-signature` (base64). Сравнение на стороне получателя
  должно использовать `timingSafeEqual`.
- **TODO** Pro-версия: rotation секретов, retry с экспоненциальной задержкой,
  storage секрета в зашифрованном виде.

## 9. Env secrets

- `.env.local` в `.gitignore`.
- `.env.example` содержит только имена переменных, без значений.
- Vercel Project Settings → Environment Variables: разделение по
  Development / Preview / Production.
- `SUPABASE_SERVICE_ROLE_KEY` не помечается `NEXT_PUBLIC_*`.

## 10. Отсутствие секретов на клиенте

Bundle проверен на `npm run build`:

- `NEXT_PUBLIC_*` — только URL Supabase и anon-key, что и ожидается.
- В `chunks/` не встречаются `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`,
  `RESEND_API_KEY`, `PAYPAL_CLIENT_SECRET`.
- Server actions и API routes — server-only (помечены `"use server"` или
  лежат в `app/api/…`).

## Что подключает клиент при установке

1. `ENCRYPTION_KEY` для AES-GCM (см. [installation guide](../setup/installation-guide.md)).
2. `STRIPE_SECRET_KEY` / `PAYPAL_*` / crypto wallets под нужные методы
   оплаты.
3. `RESEND_API_KEY` + верифицированный домен Resend.
4. (опционально) Google / Meta OAuth-credentials для рекламных интеграций.
5. Включить Supabase RLS advisor в CI клиента, чтобы новые миграции не
   ломали безопасность.
