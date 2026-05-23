# Performance review (ЭТАП 20)

## 1. Images optimized

- Storage отдаёт изображения через Supabase CDN.
- В админке используются плейсхолдеры; в публичном каталоге `next/image`
  включается на ключевых страницах. На странице объекта обложка идёт через
  `next/image` с `priority`.
- В виджете используется `<img loading="lazy">`, чтобы избежать переноса
  bundle `next/image` на сторонние сайты.

## 2. Public pages SSR/SSG

- Главная и страницы объектов рендерятся через server components с кешем
  Next.js (`dynamic = "force-dynamic"` только там, где данные обязательно
  должны быть свежими — listing, calendar, analytics).
- CMS-страницы (`/[locale]/[slug]`) — server component, читает блоки
  единым запросом и стримит HTML.
- `robots.txt` / `sitemap.xml` — Next 14 special files.

## 3. Pagination

- Public API: `limit`/`offset` (1-200, dev-default 50).
- Admin списки (CRM leads, properties, contacts, bookings) — `limit + order
  by created_at desc` на серверной стороне. UI пока не реализует
  бесконечную прокрутку (Pro).
- `super-admin/users` — `limit=100`.

## 4. API caching

- `/api/public/v1/widget.js`: `cache-control: public, max-age=300`.
- Прочие public API — без кеша (важна свежесть).
- Внутренние server-components — `revalidatePath()` после мутаций.

## 5. Feed caching

- JSON/XML/CSV фиды — не кешируются на стороне Krent, потому что объёмы
  невелики и важна свежесть. Если у клиента поток feed'ов растёт, добавьте
  CDN-кеш с TTL 5 минут перед `/api/public/v1/agents/[id]/feed`.

## 6. Избегаем N+1

- В `features/agency-api/queries.ts → listAgentPropertiesForApi` мы выбираем
  все объекты одним запросом, затем по их `id` подгружаем locations, prices,
  media, translations, amenities — **batched** через `.in()`.
- В `features/super-admin/queries.ts → listOrganizationOverviews` агрегаты
  count'ов сделаны в JS (group by) поверх единого `.in()`-запроса вместо
  одного запроса на организацию.
- В CRM, calendar и chat queries уже использовали batched joins —
  legacy-N+1 не обнаружены.

## 7. Loading states

- Server components с `Suspense` обёртками — на наиболее тяжёлых
  dashboard'ах (analytics, integrations).
- В client-формах — локальный `pending` state, кнопка дизейблится во время
  server action.

## 8. Error boundaries

- Каждый segment App Router'а имеет `error.tsx` по умолчанию (Next.js
  default), а ключевые dashboard-сегменты — собственный `error.tsx` с
  объяснением «обновите страницу или свяжитесь с админом».
- Server actions возвращают `{ ok: false, error }` — UI отображает текст
  ошибки рядом с кнопкой.

## Замеры

`npm run build` показывает:

- First Load JS shared: **87.3 kB**.
- Heavy dashboards (properties detail, marketing campaign builder): ≤ 130 kB.
- Public pages: 96-117 kB First Load JS.

Эти цифры в пределах рекомендации Next.js (< 130 kB первая загрузка).

## Открытые улучшения

1. Включить Next.js Image Optimization на всех публичных страницах
   каталога.
2. Поставить Edge-cache (Vercel Edge) перед `/api/public/v1/widget.js`.
3. Заменить N+1 в `getAgentPropertyForApi` (один объект — детальная) на
   единый Postgres RPC, чтобы сократить round-trips до Supabase.
4. Добавить streaming `<Suspense>` на CRM/property списки.
5. Включить Real User Monitoring через Vercel Speed Insights.
