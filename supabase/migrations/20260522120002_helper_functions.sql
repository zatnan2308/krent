-- ============================================================
--  Krent: helper-функции для авторизации и RLS
--  is_org_member / has_permission объявлены SECURITY DEFINER, чтобы
--  читать таблицы членства минуя их RLS и не вызывать рекурсию,
--  когда сами используются внутри RLS-политик.
--  search_path = '' — защита SECURITY DEFINER от подмены search_path.
-- ============================================================

-- ID текущего пользователя из JWT (NULL для анонимных запросов).
create or replace function public.current_user_id()
returns uuid
language sql
stable
set search_path = ''
as $$
  select auth.uid();
$$;

-- Является ли текущий пользователь активным членом организации.
create or replace function public.is_org_member(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = org_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  );
$$;

-- Есть ли у текущего пользователя право permission_key в организации.
create or replace function public.has_permission(
  org_id uuid,
  permission_key text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members m
    join public.role_permissions rp on rp.role_id = m.role_id
    join public.permissions p on p.id = rp.permission_id
    where m.organization_id = org_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and p.key = permission_key
  );
$$;
