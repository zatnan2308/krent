# Security checklist

Чек-лист для production-установки. Должен проходить перед открытием
сайта для гостей.

## Application

- [ ] `tsc --noEmit`, `next lint`, `next build` — без ошибок
- [ ] Supabase advisor → security — 0 lints
- [ ] Все API routes защищены: либо session, либо API-key, либо CRON_SECRET
- [ ] Все cron-роуты требуют `Authorization: Bearer $CRON_SECRET`
- [ ] Все webhook-роуты проверяют подпись:
  - Stripe — через `STRIPE_WEBHOOK_SECRET`
  - PayPal — через REST `verify-webhook-signature` + `PAYPAL_WEBHOOK_ID`
  - Resend — через Svix HMAC
- [ ] Все public POST'ы (`/api/public/v1/leads`, …) идут через API-key
  с scope-валидацией
- [ ] Rate-limit на API-key — 60 req/min (можно настроить per-key)

## Secrets

- [ ] `SUPABASE_SERVICE_ROLE_KEY` есть только в server env
- [ ] `STRIPE_SECRET_KEY`, `PAYPAL_CLIENT_SECRET`, `RESEND_API_KEY`,
      `*_OAUTH_*_SECRET` есть только в server env
- [ ] `ENCRYPTION_KEY` задан (AES-256-GCM ключ)
- [ ] `CRON_SECRET` задан и отличается от dev
- [ ] В bundle (`.next/static/*`) нет ни одного `*_SECRET_KEY`
- [ ] `.env.local` в `.gitignore`

## Storage

- [ ] `chat-attachments` приватный bucket
- [ ] `property-media` публичный, но запись только через service-клиент
- [ ] `branding` публичный, запись только через service-клиент
- [ ] Private documents (`property_documents` с `is_public=false`) —
      доступ только через signed URL

## RLS

- [ ] Все бизнес-таблицы enable RLS
- [ ] SELECT-политики на `app_private.has_permission(organization_id, …)`
- [ ] INSERT/UPDATE/DELETE идут через service-клиент после явной
      permission-проверки в server actions
- [ ] Системные каталоги (`modules`, `permissions`, `roles`,
      `api_scopes`, system templates) — `using (true)` для select

## Auth

- [ ] Email/password провайдер включён
- [ ] (рекомендуется) Magic link enabled, CAPTCHA на signup
- [ ] Super Admin: создан хотя бы один `platform_admins`, отдельный от
      обычной учётки

## Domain & headers

- [ ] HTTPS обязателен, HSTS включён в Vercel
- [ ] Custom domain клиента имеет `domains.status = 'verified'`
- [ ] CORS на Agency API — только `allowed_domains` API-ключа
- [ ] iframe виджета не передаёт куки родителя

## Webhook outgoing

- [ ] HMAC-SHA256 подпись на всех событиях (`x-krent-signature`)
- [ ] Retry с экспоненциальным backoff (RETRY_DELAYS_MS)
- [ ] `previous_secret` поддерживается на 1 grace-период для rotation
- [ ] Cron `/api/cron/webhooks-retry` подключён в `vercel.json`

## Audit & logs

- [ ] Чувствительные действия пишутся в `audit_logs` (см. `server/audit.ts`)
- [ ] `api_usage_logs` доступен только admin (RLS `analytics.view`)
- [ ] Логи payment webhook'ов содержат `signature_verified=true`
