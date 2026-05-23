-- ============================================================
--  Krent: клиентские кабинеты (buyer / seller / guest portal).
--  portal_accounts — приглашения и связь client-аккаунта с
--  организацией, контактом и пользователем. properties получает
--  seller_contact_id для портала продавца.
-- ============================================================

create type portal_type as enum ('buyer', 'seller', 'guest');
create type portal_account_status as enum ('pending', 'active', 'revoked');

-- ---- portal_accounts --------------------------------------
create table portal_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  portal_type portal_type not null,
  email text not null,
  invite_token text unique,
  status portal_account_status not null default 'pending',
  invited_by uuid references auth.users(id) on delete set null,
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, contact_id, portal_type)
);
create index idx_portal_accounts_organization
  on portal_accounts (organization_id);
create index idx_portal_accounts_user on portal_accounts (user_id);
create index idx_portal_accounts_contact on portal_accounts (contact_id);

create trigger trg_portal_accounts_updated_at before update on portal_accounts
  for each row execute function set_updated_at();

-- ---- properties.seller_contact_id (портал продавца) -------
alter table properties
  add column seller_contact_id uuid
  references contacts(id) on delete set null;
create index idx_properties_seller_contact
  on properties (seller_contact_id);

-- ---- RLS portal_accounts ----------------------------------
-- Видят: сотрудники с crm.view (по своей орг) и сам клиент
-- (по своей строке). Управляют — сотрудники с crm.manage.
alter table portal_accounts enable row level security;

create policy "portal_accounts_select"
  on portal_accounts for select to authenticated
  using (
    app_private.has_permission(organization_id, 'crm.view')
    or user_id = auth.uid()
  );
create policy "portal_accounts_insert"
  on portal_accounts for insert to authenticated
  with check (app_private.has_permission(organization_id, 'crm.manage'));
create policy "portal_accounts_update"
  on portal_accounts for update to authenticated
  using (app_private.has_permission(organization_id, 'crm.manage'))
  with check (app_private.has_permission(organization_id, 'crm.manage'));
create policy "portal_accounts_delete"
  on portal_accounts for delete to authenticated
  using (app_private.has_permission(organization_id, 'crm.manage'));
