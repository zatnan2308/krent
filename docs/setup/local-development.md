# Локальная разработка

## Требования

- Node.js 20+ (LTS)
- npm 10+ (или совместимый pnpm 9 / yarn 4)
- Доступ к Supabase-проекту (см. [supabase-setup.md](supabase-setup.md))

## Установка

```bash
git clone <repo>
cd krent
npm install
cp .env.example .env.local   # заполнить переменные
npm run dev
```

Dev-сервер по умолчанию слушает <http://localhost:3000>.

## Полезные скрипты

| Команда | Что делает |
| --- | --- |
| `npm run dev` | Запуск Next.js в режиме разработки |
| `npm run build` | Production-сборка |
| `npm run start` | Production-сервер из `.next/` |
| `npm run lint` | ESLint + Next.js rules |
| `npx tsc --noEmit` | Проверка типов |

## База данных

Все миграции лежат в `supabase/migrations/` и применяются последовательно.
В development-проекте используйте отдельный Supabase-проект, чтобы случайно
не задеть продакшен. После применения миграций перегенерируйте типы:

```bash
# Используйте MCP / Supabase CLI; результат складывается в src/types/database.ts
```

## Архитектура папок

```
src/
  app/                 # Next.js App Router (public + dashboard + portal + super-admin)
    (dashboard)/       # внутренняя админка
    (super-admin)/     # platform admin
    [locale]/          # публичный сайт с локалью
    portal/            # клиентские порталы
    api/public/v1/     # Agency API
  components/          # UI-примитивы и layout
  features/<module>/   # бизнес-модули: types, schema, queries, actions, UI
  lib/                 # env, supabase, i18n, currency, SEO, encryption helpers
  server/              # auth, organization-context, permissions, public-site, user-directory
  types/database.ts    # авто-генерация из Supabase
```

## Тестовые данные

В seed-миграциях создаются: системные роли (`super_admin`, `org_owner`, `agent`,
`viewer`), permissions, типовые модули, шаблоны уведомлений и каталог API-scopes.
Первый зарегистрированный пользователь не получает автоматически super_admin —
добавьте его руками через миграцию `platform_admins` или Super Admin UI после
ручного `INSERT`.

## Hot tips

- Файлы в `app/api/public/v1/*` отмечены `export const dynamic = "force-dynamic"`.
  Не пытайтесь их prerender'ить.
- Не запускайте `npm run build` параллельно с `npm run dev` — кеш `.next/`
  будет «гонять».
- Все server actions должны быть **async exports** в файлах с `"use server"`.
- Стрингифицируйте все enums и JSON-объекты через тип `Json` из
  `src/types/database.ts`, иначе TypeScript отвергнет insert.
