# Multi-tenant

Krent — white-label платформа: одно развёртывание обслуживает множество
агентств. Каждое — независимый tenant с собственными данными, доменом,
дизайном, контентом и пользователями.

## Резолв организации

### Публичный сайт

`src/server/public-site.ts → resolvePublicOrganization()`:

1. Берём `host` из заголовков запроса.
2. Ищем запись в `domains` со статусом `verified`.
3. Если найдено — `organizations.id` из FK.
4. Иначе fallback: первая организация по `created_at` (dev-режим).

### Внутренняя админка

`src/server/organization-context.ts → requireOrganizationContext()`:

1. Берём текущего пользователя из Supabase Auth.
2. Подгружаем все `organization_members` пользователя.
3. Активную организацию выбираем по cookie `krent_active_org` или первой по
   времени.
4. Возвращаем `OrganizationContext` со списком прав, ролью, языком/валютой.

### Super Admin

`src/server/permissions.ts → requireSuperAdmin()`:

1. Проверяем `platform_admins.user_id = auth.uid()`.
2. Если нет — `redirect('/dashboard')`.

## Изоляция данных

- **Сетевой уровень**: каждый домен резолвится в свою организацию; запросы
  публичного сайта не «утекают» в другую организацию.
- **Application уровень**: server actions и API routes проверяют
  `hasPermission(context, '<permission>')` перед записями.
- **DB уровень**: RLS-политики `app_private.has_permission(org, perm)`. Любой
  прямой SELECT через anon-клиент возвращает только разрешённые строки.

## Многоязычность

`organizations.default_language` + `enabled_languages`. URL содержит сегмент
`/[locale]/…` для публичного сайта. middleware (`src/middleware.ts`) выбирает
locale из cookie или `Accept-Language`.

## Многовалютность

`organizations.default_currency` + `enabled_currencies`. Selector валюты
доступен пользователю на публичном сайте, выбор сохраняется в cookie.

## Брендинг

`brand_settings` (отдельная таблица) хранит логотип, цвета, fonts. Public
layout читает их через service-клиент в `getPublicSiteContext()`.

## Custom domains

`domains` (status: `pending`/`verified`/`failed`/`disabled`). Поток:

1. Админ агентства вводит домен.
2. Krent создаёт DNS-инструкцию (CNAME на основной хост).
3. После подтверждения SSL — статус → `verified`.
4. Резолв публичного сайта работает с этим доменом.

## Cross-tenant сценарии (Agency API)

Сайт риэлтора может быть внешним доменом и тянуть данные через Agency API:

- Сам сайт не имеет доступа к Supabase.
- API-ключ агента ограничен `agent_id`, `scopes`, `allowed_domains`,
  `rate_limit_per_minute`.
- Restricted fields (контакты владельца, internal notes, комиссии, exact
  address) фильтруются на серверной стороне до отдачи.

См. [api/public-api.md](../api/public-api.md).

## Невозможные сценарии

- Пользователь без членства в организации **не** видит её данных. Это
  гарантировано RLS + organization-context.
- Прямой запрос на anon-ключе без auth выдаёт пустой результат, даже если
  знать UUID организации (RLS блокирует).
- Service-role ключ — единственный путь обхода RLS, и он живёт только на
  сервере (`src/lib/supabase/server.ts → createAdminClient`).
