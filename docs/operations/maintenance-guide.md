# Maintenance guide

## Регулярные задачи

### Ежедневно (cron)

- `/api/cron/calendar-sync` — раз в час, импорт iCal-фидов (зарегистрирован в `vercel.json`)
- `/api/cron/webhooks-retry` — каждые 5 минут, повторная доставка
  webhook'ов (зарегистрирован в `vercel.json`)
- (план) `/api/cron/integrations-sync` — раз в сутки, обновление
  отчётов Search Console / Ads (роут ещё не реализован — см. P2 в `docs/ADMIN_AUDIT.md`)

> ⚠️ Cron чаще раза в сутки требует тариф Vercel **Pro**; на **Hobby** запускается
> максимум раз в день. Также для работы нужен `CRON_SECRET` в env Vercel.

### Еженедельно (вручную)

- Проверить `super-admin/health`: нет ли pending очередей > 100, нет
  ли failed webhook'ов > 50
- Просмотреть `audit_logs` за неделю: чувствительные действия
- Дополнительный `pg_dump` помимо Supabase backups

### Ежемесячно

- Удалить старые `analytics_events` (> 13 месяцев) — иначе таблица
  растёт неограниченно
- Прогнать `next build` локально, чтобы убедиться, что зависимости
  компилируются на новой версии Node

## Обновление платформы

1. Pull новую версию репозитория Krent
2. `npm install`
3. Применить новые миграции из `supabase/migrations/`
4. Регенерация типов: `generate_typescript_types` → `scripts/write-types.js`
5. `npx tsc --noEmit`, `npx next lint`, `npx next build`
6. Deploy на staging, smoke-test
7. Deploy на production

При обновлении лицензии:
- Если меняется major version, обновите `product_version` во всех
  активных лицензиях
- Если истекает `updates_until`, клиент не может получать новые версии
  без продления лицензии (договорённость на уровне поддержки)

## Disaster recovery

См. также [supabase-setup.md → backups](../setup/supabase-setup.md#7-platnyj-plan).

Минимальные требования:
- Daily backups Supabase активны
- Еженедельный pg_dump в собственное холодное хранилище (S3 или
  аналог)
- Регулярная (квартально) тренировка восстановления: восстановить
  pg_dump на staging-проект, проверить целостность данных

## Поддержка пользователей

- Email клиента: `client_email` в лицензии
- Расписание: `support_until` дата
- Канал: согласовать с клиентом (e-mail / Slack / Telegram)
- SLA: фиксируется в договоре, в самом продукте не отображается

## Известные операционные ограничения

- `widget.js` кешируется CDN'ом до 5 минут — изменения видны не сразу
- `analytics_events` собирается eventually consistent, может содержать
  дубли при сетевых ретраях
- В serverless-инстансах PayPal `tokenCache` живёт ~9 часов; redeploy
  обнуляет кеш — это нормально
