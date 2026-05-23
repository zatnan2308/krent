# Licenses

Лицензия в Krent — это запись о выданной установке. Она **не** тариф.
Лицензия отвечает:

- какому клиенту выдана копия (client_name, client_email);
- для какого домена / организации (domain);
- активна ли (status: active / suspended / expired / revoked);
- какая версия установлена (product_version);
- до какой даты поддержка (support_until);
- до какой даты доступны обновления (updates_until);
- комментарии (notes).

## Структура таблицы

```sql
licenses (
  id uuid,
  organization_id uuid,
  license_key text unique,
  installation_type license_installation_type,
  client_name text,
  client_email text,
  domain text,
  product_version text,
  issued_at timestamptz,
  expires_at timestamptz,
  support_until timestamptz,
  updates_until timestamptz,
  status license_status,
  notes text
)
```

`license_installation_type` (enum):
- `solo_realtor_installation`
- `agency_installation`
- `property_management_installation`
- `custom_installation`

`license_status` (enum):
- `active`
- `suspended` — установка не блокируется автоматически, поддержка
  приостановлена; решение по доступу принимает super_admin
- `expired` — срок действия лицензии истёк
- `revoked` — лицензия отозвана клиенту

## Что лицензия не делает

- **Не** блокирует отдельные функции по тарифам.
- **Не** запрещает использование модуля.
- **Не** влияет на расчёт цены продажи (это бизнес-договорённость
  клиента с производителем установки).

## Что включает/отключает модули

`organization_modules.enabled` — техническая настройка установки.
Управляется Super Admin'ом или владельцем организации с правом
`modules.manage`. Это не тариф, а способ скрыть в UI то, чем клиент
не пользуется.

## Выдача лицензии

Super Admin → Licenses → Issue license (см. UI: `/super-admin/licenses`).
`license_key` генерируется на сервере (40 hex-символов). Покажите его
клиенту один раз — после этого он остаётся в БД для аудита и
проверки.

## Аудит

Все действия с лицензией (`issued`, `status_changed`) логируются в
`audit_logs` через `server/audit.ts`.
