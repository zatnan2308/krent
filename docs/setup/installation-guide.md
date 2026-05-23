# Installation guide

Полная коммерческая установка Krent занимает 1–2 рабочих дня при условии,
что у клиента готовы все внешние аккаунты (Supabase, Vercel, домен,
платежи, e-mail).

## 1. Подготовка аккаунтов клиента

- Vercel Team / Hobby account
- Supabase organization + новый Project (платный тариф для production)
- Resend account + верифицированный sending-домен
- Stripe account (test mode для проверки, live для production)
- (опционально) PayPal Business account
- (опционально) Crypto wallets (USDT TRC20, BTC, ETH — на усмотрение клиента)
- (опционально) Google Cloud project с OAuth-credentials
- (опционально) Meta for Developers app

## 2. Применение миграций

В новом Supabase-проекте применить все файлы из `supabase/migrations/`
строго по порядку имени. Проверить `get_advisors → security` — должно
быть пусто.

## 3. Storage buckets

См. [supabase-setup.md](supabase-setup.md). Создаются: `property-media`,
`chat-attachments`, `branding`. Доступ — только через service-клиент.

## 4. Переменные окружения

Заполнить `.env.local` (для разработки) и Vercel Project Settings (для
production). Полный список — [environment-variables.md](environment-variables.md).

Обязательные для production:
- `SUPABASE_*`
- `NEXT_PUBLIC_SITE_URL`
- `ENCRYPTION_KEY` (32 байта; hex или base64)
- `CRON_SECRET` (любая случайная строка)
- `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `EMAIL_FROM_DEFAULT`

Опциональные (по тем модулям, что нужны клиенту): Stripe, PayPal,
Google/Meta OAuth.

## 5. Деплой на Vercel

См. [deployment-vercel.md](deployment-vercel.md).

## 6. Первая организация

После деплоя:

1. Зарегистрироваться через `/sign-up`.
2. Подключиться к Supabase Dashboard.
3. INSERT в `platform_admins (user_id)` — стать super_admin.
4. Зайти в `/super-admin → Licenses → Issue license` и выписать лицензию
   клиенту (см. [licenses.md](../architecture/licenses.md)).
5. Создать `organizations` (если не было автоматически).
6. Добавить домен клиента в `domains` и выставить status = `verified`
   после прохождения SSL.

## 7. Настройка модулей

В Super Admin → Organization → Modules клиент может технически
отключить модули, которыми не пользуется (например, `crypto`, если
не принимает крипту). Это не лицензионное ограничение, а удобство.

## 8. Запуск

Пройти [client-launch-checklist.md](../operations/client-launch-checklist.md)
перед открытием сайта для гостей.
