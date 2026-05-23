-- ============================================================
--  Krent: платформенный Super Admin
--  platform_admins хранит пользователей с доступом уровня платформы.
--  Super Admin не привязан к организации, поэтому это отдельная
--  таблица, а не роль в organization_members.
-- ============================================================

create table platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table platform_admins enable row level security;

-- Является ли текущий пользователь платформенным Super Admin.
create function app_private.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.platform_admins
    where user_id = auth.uid()
  );
$$;

-- Список platform_admins виден только самим Super Admin;
-- запись — только через service_role.
create policy "platform_admins_select_super_admin"
  on platform_admins for select to authenticated
  using (app_private.is_super_admin());
