# Переменные окружения

Krent читает переменные из `.env.local` локально и из Vercel Project Settings
в продакшене. Файл `.env.example` всегда содержит актуальный список.

## Обязательные

| Переменная | Где используется | Откуда взять |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | публичный URL Supabase-проекта | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | публичный anon-ключ | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | привилегированный ключ для admin-клиента | Supabase → Project Settings → API (никогда не отдавать в браузер) |

## Транзакционная почта

| Переменная | Назначение |
| --- | --- |
| `RESEND_API_KEY` | ключ Resend для отправки писем |
| `RESEND_WEBHOOK_SECRET` | секрет для верификации Svix-подписи Resend webhook |
| `EMAIL_FROM_DEFAULT` | дефолтный From-адрес транзакционных писем |

## Платежи

| Переменная | Назначение |
| --- | --- |
| `STRIPE_SECRET_KEY` | server-side ключ Stripe |
| `STRIPE_WEBHOOK_SECRET` | секрет endpoint'а `/api/payments/webhook/stripe` |
| `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` | OAuth-пара PayPal (sandbox или live) |
| `PAYPAL_WEBHOOK_ID` | ID webhook'а в PayPal для верификации |

## Виджеты и Agency API

Не требуют дополнительных переменных, всё хранится в БД (`api_keys` и т.д.).

## Tracking integrations

OAuth-токены хранятся в зашифрованном виде (`integration_tokens.encrypted_value`,
AES-256-GCM на ENCRYPTION_KEY). Для запуска OAuth-flow добавьте:

| Переменная | Назначение |
| --- | --- |
| `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` / `GOOGLE_OAUTH_REDIRECT_URL` | для Search Console + Google Ads |
| `META_APP_ID` / `META_APP_SECRET` / `META_OAUTH_REDIRECT_URL` | для Meta Ads |

## Production-обязательные

| Переменная | Назначение |
| --- | --- |
| `CRON_SECRET` | защита всех `/api/cron/*` маршрутов |
| `ENCRYPTION_KEY` | 32 байта (hex или base64) для AES-256-GCM шифрования токенов и webhook secrets |

## SEO / прочее

| Переменная | Назначение |
| --- | --- |
| `NEXT_PUBLIC_DEFAULT_DOMAIN` | fallback-домен в `lib/seo`, если организация не резолвится |

## Опасные ошибки

- `SUPABASE_SERVICE_ROLE_KEY` не должен попадать в `NEXT_PUBLIC_*` и не должен
  передаваться в client-компоненты.
- `STRIPE_SECRET_KEY` и `PAYPAL_CLIENT_SECRET` доступны только в server actions
  и API routes.
- Все webhook secret'ы (`STRIPE_WEBHOOK_SECRET`, `RESEND_WEBHOOK_SECRET`,
  `PAYPAL_WEBHOOK_ID`) должны проверяться при каждом запросе — иначе атакующий
  может подделать события.
