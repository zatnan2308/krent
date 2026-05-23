-- ============================================================
--  Krent: dev-seed (НЕ миграция, для локальной разработки)
--
--  Создаёт демо-организацию и привязывает к ней первого пользователя
--  из auth.users как владельца (org_owner).
--
--  Как применить:
--   1. Создайте пользователя: Supabase Dashboard -> Authentication -> Add user.
--   2. Выполните этот скрипт: Dashboard -> SQL Editor (или через коннектор).
--   3. Войдите этим пользователем на /login.
--
--  Скрипт идемпотентен — повторный запуск не создаёт дубликатов.
-- ============================================================

do $$
declare
  v_user_id uuid;
  v_org_id uuid;
  v_owner_role_id uuid;
begin
  -- Первый зарегистрированный пользователь.
  select id into v_user_id
  from auth.users
  order by created_at
  limit 1;

  if v_user_id is null then
    raise notice 'Нет пользователей в auth.users — сначала создайте пользователя.';
    return;
  end if;

  -- Системная роль владельца организации.
  select id into v_owner_role_id
  from public.roles
  where key = 'org_owner' and organization_id is null;

  -- Демо-организация (поиск по slug для идемпотентности).
  select id into v_org_id
  from public.organizations
  where slug = 'demo-agency';

  if v_org_id is null then
    insert into public.organizations (name, slug, type, status)
    values ('Demo Agency', 'demo-agency', 'agency', 'active')
    returning id into v_org_id;
  end if;

  -- Членство пользователя как владельца.
  insert into public.organization_members
    (organization_id, user_id, role_id, status)
  values (v_org_id, v_user_id, v_owner_role_id, 'active')
  on conflict (organization_id, user_id) do nothing;

  -- Брендинг по умолчанию.
  insert into public.brand_settings (organization_id)
  values (v_org_id)
  on conflict (organization_id) do nothing;

  -- Включаем несколько модулей.
  insert into public.organization_modules (organization_id, module_id, enabled)
  select v_org_id, m.id, true
  from public.modules m
  where m.key in ('properties', 'crm', 'calendar', 'bookings')
  on conflict (organization_id, module_id) do nothing;

  raise notice 'Демо-организация готова. organization_id = %', v_org_id;
end $$;
