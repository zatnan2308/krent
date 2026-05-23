# Права и роли

## Модель

- `roles` (id, key, name, is_system) — справочник ролей.
- `permissions` (key, description) — справочник прав.
- `role_permissions (role_id, permission_key)` — связи.
- `organization_members (organization_id, user_id, role_id, status)` —
  членство пользователя в организации с конкретной ролью.
- `platform_admins (user_id)` — глобальные super_admin (стоят над RLS).

## Системные роли

| Key | Назначение |
| --- | --- |
| `org_owner` | Полный доступ внутри организации |
| `agent` | Работа с CRM, объектами, бронированиями, чатом |
| `viewer` | Только чтение |

Создаются seed-миграцией. Их `is_system = true`, удалять нельзя.

## Список permissions (стабильные ключи)

`organization.view`, `organization.update`, `members.view`, `members.invite`,
`members.manage`, `roles.view`, `roles.manage`, `modules.view`,
`modules.manage`, `branding.manage`, `domains.view`, `domains.manage`,
`licenses.view`, `audit.view`, `properties.view`, `properties.create`,
`properties.update`, `properties.delete`, `crm.view`, `crm.manage`,
`rentals.view`, `rentals.manage`, `bookings.view`, `bookings.manage`,
`payments.view`, `payments.manage`, `calendar.view`, `calendar.manage`,
`analytics.view`, `marketing.manage`, `seo.manage`, `email.manage`.

Полный seed — в `supabase/migrations/…_seed_system_data.sql`.

## Проверка прав

### В server actions / API routes

```ts
const context = await requireOrganizationContext();
if (!hasPermission(context, "properties.create")) {
  return { ok: false, error: "..." };
}
```

`hasPermission` — чистый помощник на основе `OrganizationContext.permissions`,
который собирается из `role_permissions` при загрузке контекста.

### В RLS

```sql
create policy "..."
  on properties for select to authenticated
  using (app_private.has_permission(organization_id, 'properties.view'));
```

Функция `app_private.has_permission` помечена `security definer` и оборачивает
join `organization_members` × `role_permissions`. Реализация исключает
recursive RLS.

## Защищённые экшены

- **createApiKey / revokeApiKey** — `analytics.view`.
- **createProperty / updateProperty / deleteProperty** — соответствующие
  `properties.*`.
- **invite member / change role** — `members.manage`, `roles.manage`.
- **Super Admin страницы** — `requireSuperAdmin()` через `platform_admins`.

## Insert/Update/Delete

RLS на insert/update/delete для бизнес-таблиц **не** опирается на
`has_permission` напрямую (чтобы не зависеть от auth.uid() в системных
триггерах). Вместо этого мутации идут через `createAdminClient()` после
явной проверки прав в server action. Это даёт:

- невозможность мутации напрямую через anon-клиент,
- понятный контроль в коде,
- единое место для логирования и broadcast'а событий.

## Добавление нового permission

1. Добавьте строку в `permissions` через миграцию.
2. Привяжите к ролям через `role_permissions`.
3. Обновите код: `hasPermission(context, "<new.permission>")`.
4. Добавьте RLS-политику на нужные таблицы.
5. Запустите `get_advisors → security` — должно быть пусто.

## Анти-паттерны

- **Никогда** не давайте service-role ключ клиенту: всё происходит на сервере.
- **Никогда** не доверяйте `organization_id` из тела запроса — берите его из
  `OrganizationContext` или резолва домена.
- **Никогда** не вставляйте permission-проверку только в RLS — клиент может
  попасть напрямую в admin-клиент. Двойной щит: явная проверка + RLS.
