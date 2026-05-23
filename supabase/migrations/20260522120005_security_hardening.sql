-- ============================================================
--  Krent: усиление безопасности (по результатам database linter)
--  1. Фиксируем search_path триггерной функции set_updated_at.
--  2. Переносим RLS-функции is_org_member / has_permission в схему
--     app_private — PostgREST экспонирует только public, поэтому
--     внутренние SECURITY DEFINER функции перестают быть REST RPC.
--  3. Добавляем индекс на внешний ключ organization_members.invited_by.
--  RLS-политики пересоздаются со ссылками на app_private.*
-- ============================================================

-- ---- 1. Фиксированный search_path для триггерной функции ---
alter function public.set_updated_at() set search_path = '';

-- ---- 3. Недостающий индекс внешнего ключа ------------------
create index idx_organization_members_invited_by
  on organization_members (invited_by);

-- ---- 2. Приватная схема для внутренних helper-функций ------
create schema if not exists app_private;
grant usage on schema app_private to authenticated;

-- Удаляем публичные версии вместе с зависимыми RLS-политиками.
drop function if exists public.is_org_member(uuid) cascade;
drop function if exists public.has_permission(uuid, text) cascade;

create function app_private.is_org_member(org_id uuid)
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

create function app_private.has_permission(org_id uuid, permission_key text)
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

-- ---- Пересоздание RLS-политик (ссылки на app_private.*) ----
-- Политики permissions_select / modules_select не зависели от
-- функций и удалены каскадом не были.

create policy "organizations_select_member"
  on organizations for select to authenticated
  using (app_private.is_org_member(id));

create policy "organizations_update_permitted"
  on organizations for update to authenticated
  using (app_private.has_permission(id, 'organization.update'))
  with check (app_private.has_permission(id, 'organization.update'));

create policy "organization_members_select_member"
  on organization_members for select to authenticated
  using (app_private.is_org_member(organization_id));

create policy "organization_members_insert_permitted"
  on organization_members for insert to authenticated
  with check (app_private.has_permission(organization_id, 'members.manage'));

create policy "organization_members_update_permitted"
  on organization_members for update to authenticated
  using (app_private.has_permission(organization_id, 'members.manage'))
  with check (app_private.has_permission(organization_id, 'members.manage'));

create policy "organization_members_delete_permitted"
  on organization_members for delete to authenticated
  using (app_private.has_permission(organization_id, 'members.manage'));

create policy "roles_select_system_or_member"
  on roles for select to authenticated
  using (organization_id is null or app_private.is_org_member(organization_id));

create policy "roles_insert_permitted"
  on roles for insert to authenticated
  with check (
    organization_id is not null
    and app_private.has_permission(organization_id, 'roles.manage')
  );

create policy "roles_update_permitted"
  on roles for update to authenticated
  using (
    organization_id is not null
    and app_private.has_permission(organization_id, 'roles.manage')
  )
  with check (
    organization_id is not null
    and app_private.has_permission(organization_id, 'roles.manage')
  );

create policy "roles_delete_permitted"
  on roles for delete to authenticated
  using (
    organization_id is not null
    and is_system = false
    and app_private.has_permission(organization_id, 'roles.manage')
  );

create policy "role_permissions_select_visible_role"
  on role_permissions for select to authenticated
  using (
    exists (
      select 1 from roles r
      where r.id = role_id
        and (
          r.organization_id is null
          or app_private.is_org_member(r.organization_id)
        )
    )
  );

create policy "role_permissions_insert_permitted"
  on role_permissions for insert to authenticated
  with check (
    exists (
      select 1 from roles r
      where r.id = role_id
        and r.organization_id is not null
        and app_private.has_permission(r.organization_id, 'roles.manage')
    )
  );

create policy "role_permissions_delete_permitted"
  on role_permissions for delete to authenticated
  using (
    exists (
      select 1 from roles r
      where r.id = role_id
        and r.organization_id is not null
        and app_private.has_permission(r.organization_id, 'roles.manage')
    )
  );

create policy "organization_modules_select_member"
  on organization_modules for select to authenticated
  using (app_private.is_org_member(organization_id));

create policy "organization_modules_insert_permitted"
  on organization_modules for insert to authenticated
  with check (app_private.has_permission(organization_id, 'modules.manage'));

create policy "organization_modules_update_permitted"
  on organization_modules for update to authenticated
  using (app_private.has_permission(organization_id, 'modules.manage'))
  with check (app_private.has_permission(organization_id, 'modules.manage'));

create policy "organization_modules_delete_permitted"
  on organization_modules for delete to authenticated
  using (app_private.has_permission(organization_id, 'modules.manage'));

create policy "brand_settings_select_member"
  on brand_settings for select to authenticated
  using (app_private.is_org_member(organization_id));

create policy "brand_settings_insert_permitted"
  on brand_settings for insert to authenticated
  with check (app_private.has_permission(organization_id, 'branding.manage'));

create policy "brand_settings_update_permitted"
  on brand_settings for update to authenticated
  using (app_private.has_permission(organization_id, 'branding.manage'))
  with check (app_private.has_permission(organization_id, 'branding.manage'));

create policy "domains_select_member"
  on domains for select to authenticated
  using (app_private.is_org_member(organization_id));

create policy "domains_insert_permitted"
  on domains for insert to authenticated
  with check (app_private.has_permission(organization_id, 'domains.manage'));

create policy "domains_update_permitted"
  on domains for update to authenticated
  using (app_private.has_permission(organization_id, 'domains.manage'))
  with check (app_private.has_permission(organization_id, 'domains.manage'));

create policy "domains_delete_permitted"
  on domains for delete to authenticated
  using (app_private.has_permission(organization_id, 'domains.manage'));

create policy "licenses_select_member"
  on licenses for select to authenticated
  using (app_private.is_org_member(organization_id));

create policy "audit_logs_select_permitted"
  on audit_logs for select to authenticated
  using (
    organization_id is not null
    and app_private.has_permission(organization_id, 'audit.view')
  );
