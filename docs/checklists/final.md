# Final checks (ЭТАП 20)

Запускать перед каждым деплоем на production. Все проверки должны быть
зелёными; красный пункт — блокер.

## Install check

- [ ] `npm install` без ошибок и без peer-warning'ов на свежем clone.
- [ ] `node --version` ≥ 20.x.
- [ ] `package-lock.json` коммитнут.

## TypeScript

- [ ] `npx tsc --noEmit` — без ошибок.
- [ ] `src/types/database.ts` соответствует Supabase (регенерация после
  каждой миграции).

## Lint

- [ ] `npm run lint` — `✔ No ESLint warnings or errors`.

## Build

- [ ] `npm run build` завершается успешно.
- [ ] All routes собраны (см. таблицу маршрутов в выводе build).
- [ ] First Load JS shared ≤ 100 KB.

## Manual route checklist

Зайдите под тестовым пользователем-org_owner и пройдите ключевые маршруты:

### Публичный сайт

- [ ] `/` — главная (после редиректа на `/{locale}`).
- [ ] `/{locale}/properties` — каталог.
- [ ] `/{locale}/properties/{slug}` — карточка объекта (галерея, карта,
  CTA, booking widget).
- [ ] `/{locale}/agents/{id}` — публичный профиль агента.
- [ ] `/{locale}/buy`, `/rent`, `/vacation-rentals`, `/sell`.
- [ ] `/robots.txt`, `/sitemap.xml`.

### Виджет

- [ ] `/widget/{agentId}` — отображает 24 объекта агента.
- [ ] HTML-snippet из Dashboard → Agent Sync вставляется и работает в
  тестовом HTML-файле.

### Dashboard

- [ ] `/dashboard` — overview.
- [ ] `/dashboard/properties` — список и создание.
- [ ] `/dashboard/crm` (+ leads / contacts / deals / tasks).
- [ ] `/dashboard/bookings` (+ детальная).
- [ ] `/dashboard/calendar`.
- [ ] `/dashboard/messages`.
- [ ] `/dashboard/email`.
- [ ] `/dashboard/marketing` (+ campaign builder).
- [ ] `/dashboard/seo`.
- [ ] `/dashboard/analytics`.
- [ ] `/dashboard/integrations` (+ Google/Meta/GSC dashboards).
- [ ] `/dashboard/agent-sync` — API keys, webhooks, widget snippet.
- [ ] `/dashboard/settings`.

### Portal

- [ ] `/portal` — hub.
- [ ] `/portal/buyer`, `/portal/seller`, `/portal/guest`.
- [ ] `/portal/messages`.

### Super Admin

- [ ] `/super-admin` — overview.
- [ ] `/super-admin/organizations` — список.
- [ ] `/super-admin/organizations/{id}` — 13 секций.
- [ ] `/super-admin/users` — все пользователи.
- [ ] `/super-admin/health` — system health.

### API

- [ ] `GET /api/public/v1/agents/{id}/properties` с валидным ключом → 200.
- [ ] Без `Authorization` → 401.
- [ ] С ключом без нужного scope → 403.
- [ ] При превышении rate limit (61-й запрос за минуту) → 429.

## Env checklist

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (только server)
- [ ] `RESEND_API_KEY` + `RESEND_WEBHOOK_SECRET` + `EMAIL_FROM_DEFAULT`
- [ ] `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`
- [ ] `PAYPAL_CLIENT_ID` + `PAYPAL_CLIENT_SECRET` + `PAYPAL_WEBHOOK_ID`
- [ ] `CRON_SECRET` (для cron-endpoint'а)
- [ ] (опционально) `GOOGLE_OAUTH_CLIENT_ID/SECRET`, `META_APP_ID/SECRET`,
  `ENCRYPTION_KEY`

## Supabase migration checklist

- [ ] Все миграции из `supabase/migrations/` применены в нужном порядке.
- [ ] `get_advisors → security` возвращает 0 lints.
- [ ] Storage buckets `property-media`, `chat-attachments`, `branding`
  существуют, политики настроены.
- [ ] Включён Realtime для `messages`, `message_reads`, `conversations`.
- [ ] Создан хотя бы один `platform_admins.user_id` для управления.
- [ ] Создан хотя бы один `organizations` со `slug` под основной домен.
- [ ] У главного домена `domains.status = 'verified'`.

## Cron

- [ ] `vercel.json` содержит хотя бы один cron-job
  (`/api/cron/calendar-sync`).
- [ ] Endpoint защищён `x-cron-secret`.

## Backups

- [ ] Платный тариф Supabase активен (требуется для daily backups и
  поддержки production-нагрузки; не имеет отношения к лицензии Krent).
- [ ] Daily backup включён.
- [ ] Ручной pg_dump отрабатывает (раз в неделю).

## Финальная сверка

- [ ] Все 110 задач из плана разработки — completed.
- [ ] `docs/` содержит 13 страниц из ЭТАП 20.
- [ ] README в корне обновлён (опционально, не блокер).
- [ ] Контактные данные суппорта вписаны в `notification_templates` и в
  футер CMS.
