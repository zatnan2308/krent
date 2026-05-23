# Domain setup

Каждая организация в Krent может иметь один или несколько подключённых
доменов. Резолв публичного сайта идёт по `host` запроса через таблицу
`domains` (только `status = 'verified'`).

## Шаги

1. Клиент покупает домен у любого регистратора.
2. В Vercel Project → Domains добавить домен; Vercel выдаст инструкцию по
   CNAME / A-записи.
3. После прохождения SSL добавить запись в `domains` (Super Admin):
   - `organization_id` нужной организации
   - `domain` — точное имя (lowercase, без `https://`)
   - `status` — `verified`
   - `is_primary` — `true`, если это основной домен
4. Подождать несколько минут — middleware начнёт резолвить tenant'а.

## Wildcard-домены

Для агентских сайтов используется отдельная таблица `external_domains`
(не путать с `domains`). Они работают через Agency API + widget и не
обязаны быть подключены как основной домен tenant'а.

## Common pitfalls

- Если открыли сайт по `host` без записи в `domains` — попадаете на
  fallback (первая организация в БД). Это допустимо для dev и для
  страниц без tenant-привязки (например, super-admin), но **не** для
  production-tenant'а.
- Wildcard subdomain `*.example.com` нельзя добавить в `domains` — там
  нужна точная запись. Используйте отдельную запись на каждый поддомен.
