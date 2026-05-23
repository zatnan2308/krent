# SEO

Krent рендерит публичный сайт через Next.js App Router. Каждая страница
формирует свои `metadata` и JSON-LD на сервере.

## Реализованные блоки

- **Динамические `metadata`** на каждой публичной странице, локализованы.
- **`robots.ts`** — разрешает индексирование только если включено в
  `seo_settings.robots_index`.
- **`sitemap.xml`** — формируется на лету, включает страницы, объекты, area-
  страницы.
- **Image sitemap** — `/api/image-sitemap` отдаёт XML с фотографиями объектов.
- **JSON-LD** — для `Organization`, `RealEstateListing` (объект),
  `BreadcrumbList`, `FAQPage` на типовых страницах.
- **Hreflang** — alternate-теги на локализованных URL.
- **Canonical** — учёт canonical_owner (`agency`/`agent`/`both_unique`/
  `noindex_agent`) из настроек Agent Sync.

## Anti-pattern «миллион индексируемых фильтров»

Public listing-страницы с query-параметрами (`?bedrooms=2&price=…`) помечены
`noindex` через `robots`. Индексируются только curated area-страницы из
таблицы `area_pages` (генерируются Super Admin'ом / агентством руками).

## Локали в URL

`[locale]` — обязательный сегмент для всех публичных страниц. middleware
редиректит `/` → `/{lang}` по cookie или Accept-Language. Не-localized
маршруты: `/api`, `/dashboard`, `/portal`, `/super-admin`, `/login`,
`/widget`.

## Структурированные данные

`src/lib/seo/index.ts` экспортирует помощники:

- `organizationSchema()` — для main layout.
- `propertySchema(property)` — для страницы объекта.
- `breadcrumbsSchema(...)` — для всех страниц с хлебными крошками.

Возвращают объект, который сериализуется в `<script type="application/ld+json">`.

## Carbon copy на сайтах агентов

Когда объект публикуется как на основном сайте агентства, так и на сайте
агента (Agency API + widget), Krent учитывает `canonical_owner` из
`agent_website_connections`:

- `agency` — canonical указывает на сайт агентства.
- `agent` — canonical указывает на сайт агента.
- `both_unique` — обе версии уникальны, без cross-canonical.
- `noindex_agent` — внешний сайт агента помечается `noindex`.

## Чек-лист перед запуском клиента

- [ ] `seo_settings.robots_index = true` для production-tenant.
- [ ] Sitemap включает реальный домен (резолв через `resolvePublicOrganization`).
- [ ] У всех property-translations заполнены `seo_title` и `seo_description`.
- [ ] `area_pages` под целевые города/районы созданы.
- [ ] `canonical_owner` выбран осознанно для каждого agent-connection.
