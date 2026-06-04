# Деплой на Vercel

## 1. Импорт репозитория

В Vercel Dashboard → Add New → Project выберите репозиторий. Framework
определяется автоматически (Next.js). В разделе **Environment Variables**
заполните все переменные из [environment-variables.md](environment-variables.md).

## 2. Build settings

- Install command: `npm install`
- Build command: `npm run build`
- Output: `.next` (по умолчанию)
- Node.js: 24.x

## 3. Production domain

Krent работает как multi-tenant: каждому tenant'у соответствует домен из
таблицы `domains` (status = `verified`). На уровне Vercel:

1. Подключите wildcard-домен организации: `*.yourdomain.com`.
2. Для production-tenant'а — отдельный custom domain.
3. SSL — автоматически (Let's Encrypt).

## 4. Cron-jobs (через GitHub Actions, НЕ Vercel Cron)

> ⚠️ **Почему не Vercel Cron.** На плане **Hobby** Vercel разрешает cron-jobs
> только раз в сутки (и максимум 2 шт). Почасовой iCal-синк и 5/10-минутные
> задачи это нарушают, и тогда **каждый деплой падает** с ошибкой
> «This cron expression (`0 * * * *`) would run more than once per day».
> Поэтому ключ `crons` из `vercel.json` **убран**, а расписания вынесены в
> бесплатный GitHub Actions workflow.

Файл [`.github/workflows/cron.yml`](../../.github/workflows/cron.yml) по
расписанию (UTC) дёргает эндпоинты `/api/cron/*` на production-домене:

| Endpoint | Частота | Назначение |
|---|---|---|
| `/api/cron/calendar-sync` | ежечасно | импорт iCal-фидов (booking.com/Airbnb/VRBO), защита от овербукинга |
| `/api/cron/webhooks-retry` | каждые 5 мин | ретраи недоставленных webhook'ов Agent Sync |
| `/api/cron/campaigns-dispatch` | каждые 10 мин | отправка запланированных email-кампаний |
| `/api/cron/task-reminders` | раз в день, 09:00 | напоминания по задачам CRM |

Каждый handler принимает только GET с заголовком
`Authorization: Bearer ${CRON_SECRET}` (без секрета — 401). Поэтому `CRON_SECRET`
нужен **в двух местах с одинаковым значением**:

1. **GitHub** → репозиторий → Settings → *Secrets and variables → Actions* →
   secret `CRON_SECRET` (его читает workflow).
2. **Vercel** → Project → Settings → *Environment Variables* → `CRON_SECRET`
   (Production) — его проверяют сами маршруты.

Базовый URL задан в `env.BASE_URL` внутри workflow — поменяйте при переходе на
custom domain. Ручная проверка: вкладка **Actions → «Scheduled cron jobs» →
Run workflow** (`workflow_dispatch`) — все 4 эндпоинта должны вернуть HTTP 200.

> 💡 **Нужны нативные Vercel Cron?** Апгрейд на **Pro** снимает лимит частоты —
> тогда можно вернуть блок `crons` в `vercel.json` и удалить workflow.
>
> ℹ️ **Регион** фиксируется в `vercel.json` (`"regions": ["dub1"]`, Dublin —
> рядом с Supabase `eu-west-1`); отдельно в настройках выбирать не нужно.

## 5. Sensitive runtime

- **Edge runtime** не используется: все Supabase-вызовы идут через Node-only
  pakety (`@supabase/supabase-js` + crypto). Сборка падает, если случайно
  включить `runtime: "edge"` на route'е, использующем admin-клиент.
- Все API routes под `/api/public/v1/*` имеют `dynamic = "force-dynamic"`.

## 6. Логи

Включите **Vercel Log Drain** (Logflare/Datadog/etc.), чтобы хранить логи API
дольше 1 часа (free plan). Логи API-usage лежат в БД (`api_usage_logs`).

## 7. Custom domain → tenant

Когда клиент добавляет новый домен:

1. В админке Krent: `Settings → Domains → Add domain`.
2. Krent сохраняет строку в `domains` со статусом `pending`.
3. Клиент настраивает CNAME → vercel deployment.
4. После прохождения SSL — обновите status в `verified` (вручную или через
   будущий webhook от Vercel API).

## 8. Production checklist (короткий)

- [ ] Все обязательные env заполнены
- [ ] `SUPABASE_SERVICE_ROLE_KEY` не попал в `NEXT_PUBLIC_*`
- [ ] `CRON_SECRET` совпадает в GitHub Actions secret и Vercel env (Production), отличается от dev
- [ ] Workflow `.github/workflows/cron.yml` добавлен и проходит (Actions → Run workflow → все 4 эндпоинта 200)
- [ ] У super_admin отдельная учётка, не используется для обычной работы
- [ ] Backups Supabase включены
- [ ] Регион функций = `dub1` зафиксирован в `vercel.json` (рядом с Supabase eu-west-1)

Подробный финальный чек-лист: [../checklists/final.md](../checklists/final.md).
