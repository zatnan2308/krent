-- ============================================================
--  Krent: core schema (multi-tenant фундамент)
--  Enum-типы, таблицы, внешние ключи, индексы, updated_at-триггеры.
--  Каждая будущая бизнес-таблица обязана нести organization_id.
-- ============================================================

-- ---- Enum-типы ---------------------------------------------
create type organization_type as enum (
  'solo_realtor',
  'agency',
  'property_management',
  'brokerage'
);

create type organization_status as enum ('active', 'inactive', 'suspended');

create type member_status as enum (
  'invited',
  'active',
  'inactive',
  'suspended'
);

create type domain_type as enum ('primary', 'agent', 'landing', 'api');

create type domain_status as enum (
  'pending',
  'verified',
  'failed',
  'disabled'
);

create type license_status as enum (
  'active',
  'expired',
  'suspended',
  'revoked'
);

-- ---- Функция автообновления updated_at ---------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---- 1. organizations -------------------------------------
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 200),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  type organization_type not null default 'agency',
  status organization_status not null default 'active',
  default_language text not null default 'en'
    check (char_length(default_language) between 2 and 10),
  default_currency text not null default 'USD'
    check (default_currency ~ '^[A-Z]{3}$'),
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---- 3. roles (создаётся до organization_members) ----------
-- Системные роли: organization_id IS NULL, доступны всем организациям.
-- Кастомные роли: organization_id задан и принадлежит организации.
create table roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  key text not null check (key ~ '^[a-z0-9_]+$'),
  name text not null,
  description text,
  is_system boolean not null default false
);

create unique index roles_system_key_uniq
  on roles (key) where organization_id is null;
create unique index roles_org_key_uniq
  on roles (organization_id, key) where organization_id is not null;

-- ---- 4. permissions ---------------------------------------
create table permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key ~ '^[a-z0-9_]+\.[a-z0-9_]+$'),
  description text
);

-- ---- 5. role_permissions ----------------------------------
create table role_permissions (
  role_id uuid not null references roles(id) on delete cascade,
  permission_id uuid not null references permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

-- ---- 2. organization_members ------------------------------
-- role_id — внешний ключ на roles (нормализация вместо текстового поля).
create table organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid not null references roles(id),
  status member_status not null default 'invited',
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

-- ---- 6. modules -------------------------------------------
create table modules (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key ~ '^[a-z0-9_]+$'),
  name text not null,
  description text
);

-- ---- 7. organization_modules ------------------------------
create table organization_modules (
  organization_id uuid not null references organizations(id) on delete cascade,
  module_id uuid not null references modules(id) on delete cascade,
  enabled boolean not null default false,
  primary key (organization_id, module_id)
);

-- ---- 8. brand_settings (1:1 с организацией) ----------------
create table brand_settings (
  organization_id uuid primary key
    references organizations(id) on delete cascade,
  logo_url text,
  favicon_url text,
  primary_color text
    check (primary_color is null or primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  secondary_color text
    check (secondary_color is null or secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  accent_color text
    check (accent_color is null or accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  font_family text,
  custom_css text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---- 9. domains -------------------------------------------
create table domains (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  domain text not null unique
    check (domain = lower(domain) and char_length(domain) between 3 and 253),
  type domain_type not null default 'primary',
  status domain_status not null default 'pending',
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---- 10. licenses -----------------------------------------
create table licenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  license_key text not null unique,
  status license_status not null default 'active',
  package_name text not null,
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  support_expires_at timestamptz
);

-- ---- 11. audit_logs ---------------------------------------
-- organization_id и user_id nullable: логи переживают удаление сущностей.
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---- Индексы по внешним ключам -----------------------------
create index idx_roles_organization on roles (organization_id);
create index idx_role_permissions_permission
  on role_permissions (permission_id);
create index idx_organization_members_organization
  on organization_members (organization_id);
create index idx_organization_members_user
  on organization_members (user_id);
create index idx_organization_members_role
  on organization_members (role_id);
create index idx_organization_modules_module
  on organization_modules (module_id);
create index idx_domains_organization on domains (organization_id);
create index idx_licenses_organization on licenses (organization_id);
create index idx_audit_logs_organization on audit_logs (organization_id);
create index idx_audit_logs_user on audit_logs (user_id);
create index idx_audit_logs_created_at on audit_logs (created_at desc);
create index idx_audit_logs_entity
  on audit_logs (entity_type, entity_id);

-- ---- updated_at триггеры -----------------------------------
create trigger trg_organizations_updated_at
  before update on organizations
  for each row execute function set_updated_at();
create trigger trg_organization_members_updated_at
  before update on organization_members
  for each row execute function set_updated_at();
create trigger trg_brand_settings_updated_at
  before update on brand_settings
  for each row execute function set_updated_at();
