# Настройка Supabase

## 1. Создайте проект

Зарегистрируйте новый проект в [Supabase](https://supabase.com/). Регион выбирайте
ближе к основной аудитории. Запишите:

- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` ключ → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` ключ → `SUPABASE_SERVICE_ROLE_KEY`

## 2. Примените миграции

Все DDL-файлы лежат в `supabase/migrations/` и должны накатываться по порядку
имени. На текущем этапе их применять через MCP / Supabase CLI / `psql`. Каждая
миграция атомарна: либо вся выполняется, либо нет.

Список миграций (по порядку):

1. `…_core_schema.sql` — organizations, roles, permissions, modules, audit
2. `…_helper_functions.sql` — `app_private.has_permission`, `set_updated_at`
3. `…_rls_policies.sql` — базовые RLS
4. `…_seed_system_data.sql` — роли, права, модули, типы
5. `…_platform_admins.sql` — super_admin
6. далее по модулям: CMS, properties, CRM, portals, chat, calendar, booking +
   payment, notifications, campaigns, analytics, integrations, agency-api

После каждой миграции запускайте `get_advisors → security` — должно быть
пусто. Если появились предупреждения, ищите забытые `enable row level security`
или политики.

## 3. Создайте Storage buckets

| Bucket | Назначение | Public | Notes |
| --- | --- | --- | --- |
| `property-media` | фото/видео объектов | да | размер до 10 MB на файл, MIME-фильтр в server actions |
| `chat-attachments` | вложения в чате | нет | подписанные URL, выдаются через server action |
| `branding` | логотипы и фавиконки организаций | да | контент пишет только service-клиент |

В Storage `Policies` оставьте «приватный» режим (все доступы через
service-клиент), либо настройте подписанные URL.

## 4. Auth providers

В Supabase → Authentication включите минимум `Email/Password`. Для production
рекомендуется:

- E-mail + Magic Link
- Защита от bot-регистраций (CAPTCHA)
- Включить `Restrict to organisation` через post-signup hook (опционально)

## 5. Realtime

Включите Realtime для таблиц чата: `conversations`, `messages`, `message_reads`.
В коде используется `@supabase/ssr` для подписки на изменения. RLS политика на
SELECT защищает realtime-канал автоматически.

## 6. Cron

Один cron-job в Vercel вызывает `/api/cron/calendar-sync` раз в час, чтобы
импортировать iCal-фиды (Airbnb, Booking и пр.). Эндпоинт защищён header'ом
`x-cron-secret`. На стороне Supabase cron не нужен.

## 7. Платный план

Free-tier Supabase достаточен только для разработки. Для продакшена:

- Pro план (как минимум) ради дневных бэкапов и точечного восстановления
- Включить connection pooling (PgBouncer mode = transaction)
- Установить `statement_timeout` ≥ 5s (большие отчёты по analytics)

## 8. Backups

Включите daily backups в Supabase Dashboard → Database → Backups. Хранение
зависит от плана; в Pro — 7 дней rolling backups. Рекомендуем дополнительно
выгружать pg_dump в собственное хранилище раз в неделю.

## 9. Тестовый super_admin

1. Создайте пользователя в Auth Dashboard.
2. INSERT в `platform_admins`:

```sql
insert into platform_admins (user_id) values ('<uuid пользователя>');
```

3. Войдите под этим пользователем — будет доступен `/super-admin`.
