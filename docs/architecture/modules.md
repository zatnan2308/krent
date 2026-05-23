# Модули

Krent — модульная платформа: каждый функциональный блок (CRM, чат, бронирование
и т.д.) можно включить или выключить на уровне организации. Это управляется
через таблицы `modules` × `organization_modules`.

## Таблицы

- `modules (id, key, name, description)` — реестр всех существующих модулей.
- `organization_modules (organization_id, module_id, enabled)` — флаг
  включения на уровне организации.

## Стандартный набор

Базовый seed создаёт следующие модули (ключ → название):

- `cms` — публичный сайт и страницы
- `properties` — каталог объектов
- `crm` — CRM
- `rentals` — аренда / клиентские порталы
- `chat` — мессенджер
- `calendar` — календарь и iCal
- `bookings` — онлайн-бронирование
- `payments` — провайдеры оплаты
- `email` — транзакционные письма
- `marketing` — email-кампании
- `seo` — SEO Engine
- `analytics` — аналитика
- `integrations` — Search Console / Google Ads / Meta Ads
- `agency_api` — Agency API и Agent Website Sync

## Проверка включения

В UI и navigation-config достаточно показать/скрыть пункт меню. На уровне
бизнес-логики module-flag — это **подсказка**, не security boundary: реальная
изоляция строится на правах (см. [permissions.md](permissions.md)). Если
модуль выключен, но у пользователя есть право — он всё равно получит данные;
лучше **отозвать** право или сделать UI редирект.

## Включение/выключение в UI

`/dashboard/settings → Modules` (заглушка-страница; полноценный UI — на
последующих этапах). Изменения сохраняются в `organization_modules` через
server action c правом `modules.manage`.

## Добавление нового модуля

1. INSERT строки в `modules` через миграцию.
2. По умолчанию `organization_modules.enabled = false` для всех существующих
   организаций (либо явно включите через ту же миграцию).
3. Добавьте permissions для нового модуля.
4. UI-страницу разместите в `app/(dashboard)/dashboard/<module>` и
   feature-код — в `src/features/<module>/`.
5. Если модуль имеет публичный API — расширьте `app/api/public/v1/…` и
   обновите [api/public-api.md](../api/public-api.md).

## Лицензирование

См. отдельную справку [licenses.md](licenses.md). Кратко: лицензия — это
запись о выданной копии установки (`license_key`, `client_name`,
`client_email`, `domain`, `installation_type`, `status`, `product_version`,
`support_until`, `updates_until`). Она не работает как тариф и не блокирует
отдельные функции — она контролирует выданную установку целиком. Технически
конкретные модули включает/выключает Super Admin через
`organization_modules`.
