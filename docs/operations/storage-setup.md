# Storage setup

Krent использует три Supabase Storage buckets. Все настройки выполнены
в development-проекте `pclhwbgsxdztriqdtosg`; при установке клиента нужно
повторить ту же конфигурацию в его собственном Supabase-проекте.

## Buckets

| Bucket | Public | File size limit | Allowed MIME |
| --- | --- | --- | --- |
| `property-media` | yes | 10 MB | `image/jpeg`, `image/png`, `image/webp`, `image/avif` |
| `chat-attachments` | no | 20 MB | any |
| `branding` | yes | 5 MB | `image/jpeg`, `image/png`, `image/svg+xml`, `image/webp`, `image/x-icon` |

## SQL для нового проекта

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('property-media',   'property-media',   true,  10485760, array['image/jpeg','image/png','image/webp','image/avif']),
  ('chat-attachments', 'chat-attachments', false, 20971520, null),
  ('branding',         'branding',         true,  5242880,  array['image/jpeg','image/png','image/svg+xml','image/webp','image/x-icon'])
on conflict (id) do nothing;
```

## Policies

Все записи идут через `createAdminClient()` (service-role) в server actions
после ручной проверки прав. Поэтому RLS на storage object'ах строгий:

- `property-media`: select=allow public (bucket public), insert/update/delete=service-role only.
- `chat-attachments`: select=service-role only (отдаём через signed URL), insert/update/delete=service-role only.
- `branding`: select=allow public, insert/update/delete=service-role only.

Supabase создаёт стандартные политики по умолчанию для public buckets.
Если делаете кастомные политики — убедитесь, что INSERT/UPDATE/DELETE
блокированы для `anon` и `authenticated` (только service-role).

## Резервное копирование

- Включите Daily Backups в Supabase Dashboard → Settings → Database.
- Раз в неделю делайте `pg_dump` в собственное холодное хранилище
  (S3, B2, GCS).
- Storage backups отдельная фича Supabase (Storage Versioning) —
  включите для критичных buckets.
