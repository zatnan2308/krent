# Деплой на Vercel

## 1. Импорт репозитория

В Vercel Dashboard → Add New → Project выберите репозиторий. Framework
определяется автоматически (Next.js). В разделе **Environment Variables**
заполните все переменные из [environment-variables.md](environment-variables.md).

## 2. Build settings

- Install command: `npm install`
- Build command: `npm run build`
- Output: `.next` (по умолчанию)
- Node.js: 20.x

## 3. Production domain

Krent работает как multi-tenant: каждому tenant'у соответствует домен из
таблицы `domains` (status = `verified`). На уровне Vercel:

1. Подключите wildcard-домен организации: `*.yourdomain.com`.
2. Для production-tenant'а — отдельный custom domain.
3. SSL — автоматически (Let's Encrypt).

## 4. Cron-jobs

В `vercel.json` описаны:

```jsonc
{
  "crons": [
    { "path": "/api/cron/calendar-sync", "schedule": "0 * * * *" },
    { "path": "/api/cron/webhooks-retry", "schedule": "*/5 * * * *" }
  ]
}
```

- `calendar-sync` — почасовой импорт iCal-фидов (booking.com/Airbnb/VRBO) для
  защиты от овербукинга.
- `webhooks-retry` — повторная доставка не доставленных с первого раза
  webhook'ов Agent Sync (каждые 5 минут).

Каждый cron-handler проверяет `CRON_SECRET`: Vercel автоматически подставляет
заголовок `Authorization: Bearer ${CRON_SECRET}`, если переменная задана в
Project → Settings → Environment Variables. **Без `CRON_SECRET` в env маршруты
отвечают 401 и синхронизация не идёт.**

> ⚠️ **Тариф Vercel.** Cron-jobs частотой чаще, чем раз в сутки, доступны только
> на плане **Pro**. На **Hobby** Vercel запускает cron максимум раз в день, поэтому
> почасовой iCal-синк и 5-минутные ретраи фактически не будут работать —
> требуется Pro (та же история, что и с `regions` для близости к Supabase).

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
- [ ] Cron secret отличается от dev
- [ ] У super_admin отдельная учётка, не используется для обычной работы
- [ ] Backups Supabase включены
- [ ] Settings → Functions → Region совпадает с Supabase region

Подробный финальный чек-лист: [../checklists/final.md](../checklists/final.md).
