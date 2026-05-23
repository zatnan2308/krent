-- ============================================================
--  Krent: RLS-политики для core-таблиц
--  Принцип: доступ только для роли authenticated и только в рамках
--  своей организации. anon доступа не имеет (нет политик).
--  service_role обходит RLS — платформенные операции идут через него.
-- ============================================================

alter table organizations enable row level security;
alter table organization_members enable row level security;
alter table roles enable row level security;
alter table permissions enable row level security;
alter table role_permissions enable row level security;
alter table modules enable row level security;
alter table organization_modules enable row level security;
alter table brand_settings enable row level security;
alter table domains enable row level security;
alter table licenses enable row level security;
alter table audit_logs enable row level security;

-- ---- organizations ----------------------------------------
create policy "organizations_select_member"
  on organizations for select to authenticated
  using (is_org_member(id));

create policy "organizations_update_permitted"
  on organizations for update to authenticated
  using (has_permission(id, 'organization.update'))
  with check (has_permission(id, 'organization.update'));

-- ---- organization_members ---------------------------------
create policy "organization_members_select_member"
  on organization_members for select to authenticated
  using (is_org_member(organization_id));

create policy "organization_members_insert_permitted"
  on organization_members for insert to authenticated
  with check (has_permission(organization_id, 'members.manage'));

create policy "organization_members_update_permitted"
  on organization_members for update to authenticated
  using (has_permission(organization_id, 'members.manage'))
  with check (has_permission(organization_id, 'members.manage'));

create policy "organization_members_delete_permitted"
  on organization_members for delete to authenticated
  using (has_permission(organization_id, 'members.manage'));

-- ---- roles ------------------------------------------------
create policy "roles_select_system_or_member"
  on roles for select to authenticated
  using (organization_id is null or is_org_member(organization_id));

create policy "roles_insert_permitted"
  on roles for insert to authenticated
  with check (
    organization_id is not null
    and has_permission(organization_id, 'roles.manage')
  );

create policy "roles_update_permitted"
  on roles for update to authenticated
  using (
    organization_id is not null
    and has_permission(organization_id, 'roles.manage')
  )
  with check (
    organization_id is not null
    and has_permission(organization_id, 'roles.manage')
  );

create policy "roles_delete_permitted"
  on roles for delete to authenticated
  using (
    organization_id is not null
    and is_system = false
    and has_permission(organization_id, 'roles.manage')
  );

-- ---- permissions (глобальный справочник, только чтение) ----
create policy "permissions_select_authenticated"
  on permissions for select to authenticated
  using (true);

-- ---- role_permissions -------------------------------------
create policy "role_permissions_select_visible_role"
  on role_permissions for select to authenticated
  using (
    exists (
      select 1 from roles r
      where r.id = role_id
        and (r.organization_id is null or is_org_member(r.organization_id))
    )
  );

create policy "role_permissions_insert_permitted"
  on role_permissions for insert to authenticated
  with check (
    exists (
      select 1 from roles r
      where r.id = role_id
        and r.organization_id is not null
        and has_permission(r.organization_id, 'roles.manage')
    )
  );

create policy "role_permissions_delete_permitted"
  on role_permissions for delete to authenticated
  using (
    exists (
      select 1 from roles r
      where r.id = role_id
        and r.organization_id is not null
        and has_permission(r.organization_id, 'roles.manage')
    )
  );

-- ---- modules (глобальный справочник, только чтение) --------
create policy "modules_select_authenticated"
  on modules for select to authenticated
  using (true);

-- ---- organization_modules ---------------------------------
create policy "organization_modules_select_member"
  on organization_modules for select to authenticated
  using (is_org_member(organization_id));

create policy "organization_modules_insert_permitted"
  on organization_modules for insert to authenticated
  with check (has_permission(organization_id, 'modules.manage'));

create policy "organization_modules_update_permitted"
  on organization_modules for update to authenticated
  using (has_permission(organization_id, 'modules.manage'))
  with check (has_permission(organization_id, 'modules.manage'));

create policy "organization_modules_delete_permitted"
  on organization_modules for delete to authenticated
  using (has_permission(organization_id, 'modules.manage'));

-- ---- brand_settings ---------------------------------------
create policy "brand_settings_select_member"
  on brand_settings for select to authenticated
  using (is_org_member(organization_id));

create policy "brand_settings_insert_permitted"
  on brand_settings for insert to authenticated
  with check (has_permission(organization_id, 'branding.manage'));

create policy "brand_settings_update_permitted"
  on brand_settings for update to authenticated
  using (has_permission(organization_id, 'branding.manage'))
  with check (has_permission(organization_id, 'branding.manage'));

-- ---- domains ----------------------------------------------
create policy "domains_select_member"
  on domains for select to authenticated
  using (is_org_member(organization_id));

create policy "domains_insert_permitted"
  on domains for insert to authenticated
  with check (has_permission(organization_id, 'domains.manage'));

create policy "domains_update_permitted"
  on domains for update to authenticated
  using (has_permission(organization_id, 'domains.manage'))
  with check (has_permission(organization_id, 'domains.manage'));

create policy "domains_delete_permitted"
  on domains for delete to authenticated
  using (has_permission(organization_id, 'domains.manage'));

-- ---- licenses (чтение членам; запись — только service_role) -
create policy "licenses_select_member"
  on licenses for select to authenticated
  using (is_org_member(organization_id));

-- ---- audit_logs (чтение по праву; запись — service_role) ---
create policy "audit_logs_select_permitted"
  on audit_logs for select to authenticated
  using (
    organization_id is not null
    and has_permission(organization_id, 'audit.view')
  );
