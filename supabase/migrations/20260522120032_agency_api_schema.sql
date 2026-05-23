-- ============================================================
--  Krent: Agency API и Agent Website Sync. 12 таблиц — API
--  ключи, scopes, usage и rate limits, подключения сайтов
--  агентов, webhook-эндпоинты + очередь и логи доставки,
--  настройки sync и видимости объектов для внешних сайтов.
-- ============================================================

create type agent_canonical_owner as enum (
  'agency',
  'agent',
  'both_unique',
  'noindex_agent'
);
create type api_key_status as enum ('active', 'revoked');
create type webhook_event_status as enum (
  'pending',
  'delivered',
  'failed'
);
create type external_domain_status as enum (
  'pending',
  'active',
  'blocked'
);

-- ---- agent_website_connections ----------------------------
create table agent_website_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  agent_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  primary_domain text,
  canonical_owner agent_canonical_owner not null default 'agency',
  brand_settings jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, agent_id)
);
create index idx_agent_website_connections_organization
  on agent_website_connections (organization_id);

-- ---- api_keys ---------------------------------------------
--  key_hash — sha256 от выданного ключа; сам ключ хранится
--  только у клиента. key_prefix — первые символы для отображения.
create table api_keys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  agent_id uuid references auth.users(id) on delete set null,
  name text not null,
  key_hash text not null unique,
  key_prefix text not null,
  scopes text[] not null default '{}'::text[],
  allowed_domains text[] not null default '{}'::text[],
  rate_limit_per_minute integer not null default 60
    check (rate_limit_per_minute > 0),
  status api_key_status not null default 'active',
  last_used_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index idx_api_keys_organization on api_keys (organization_id);
create index idx_api_keys_agent on api_keys (agent_id);

-- ---- api_scopes (системный каталог) -----------------------
create table api_scopes (
  key text primary key,
  description text not null,
  created_at timestamptz not null default now()
);

-- ---- api_usage_logs ---------------------------------------
create table api_usage_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  api_key_id uuid references api_keys(id) on delete set null,
  method text not null,
  path text not null,
  status integer not null,
  ip text,
  occurred_at timestamptz not null default now()
);
create index idx_api_usage_logs_org_time
  on api_usage_logs (organization_id, occurred_at desc);
create index idx_api_usage_logs_key_time
  on api_usage_logs (api_key_id, occurred_at desc);

-- ---- api_rate_limits (минутные окна) ----------------------
create table api_rate_limits (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  api_key_id uuid not null references api_keys(id) on delete cascade,
  window_start timestamptz not null,
  request_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique (api_key_id, window_start)
);
create index idx_api_rate_limits_key
  on api_rate_limits (api_key_id, window_start desc);

-- ---- external_domains -------------------------------------
create table external_domains (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  agent_website_connection_id uuid
    references agent_website_connections(id) on delete cascade,
  domain text not null,
  status external_domain_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (organization_id, domain)
);
create index idx_external_domains_organization
  on external_domains (organization_id);

-- ---- webhook_endpoints ------------------------------------
create table webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  agent_website_connection_id uuid
    references agent_website_connections(id) on delete cascade,
  url text not null,
  secret text,
  event_types text[] not null default '{}'::text[],
  is_active boolean not null default true,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_webhook_endpoints_organization
  on webhook_endpoints (organization_id);

-- ---- webhook_events (очередь событий) ---------------------
create table webhook_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  event_type text not null,
  entity_type text,
  entity_id uuid,
  payload jsonb not null default '{}'::jsonb,
  status webhook_event_status not null default 'pending',
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
create index idx_webhook_events_org
  on webhook_events (organization_id, created_at desc);
create index idx_webhook_events_status
  on webhook_events (organization_id, status);

-- ---- webhook_delivery_logs --------------------------------
create table webhook_delivery_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  webhook_event_id uuid
    references webhook_events(id) on delete cascade,
  webhook_endpoint_id uuid
    references webhook_endpoints(id) on delete set null,
  attempt integer not null default 1,
  status text not null,
  response_code integer,
  response_body text,
  attempted_at timestamptz not null default now()
);
create index idx_webhook_delivery_logs_event
  on webhook_delivery_logs (webhook_event_id);
create index idx_webhook_delivery_logs_org
  on webhook_delivery_logs (organization_id, attempted_at desc);

-- ---- property_sync_settings (per-org defaults) ------------
create table property_sync_settings (
  organization_id uuid primary key
    references organizations(id) on delete cascade,
  default_canonical_owner agent_canonical_owner not null default 'agency',
  hide_owner_contacts boolean not null default true,
  hide_internal_notes boolean not null default true,
  hide_commission boolean not null default true,
  hide_private_documents boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---- property_external_visibility (per-property override) -
create table property_external_visibility (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  agent_website_connection_id uuid not null
    references agent_website_connections(id) on delete cascade,
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  unique (property_id, agent_website_connection_id)
);
create index idx_property_external_visibility_organization
  on property_external_visibility (organization_id);

-- ---- agent_feed_settings ----------------------------------
create table agent_feed_settings (
  agent_website_connection_id uuid primary key
    references agent_website_connections(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  default_locale text not null default 'en',
  default_currency text not null default 'USD',
  include_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---- updated_at триггеры ----------------------------------
create trigger trg_agent_website_connections_updated_at
  before update on agent_website_connections
  for each row execute function set_updated_at();
create trigger trg_api_keys_updated_at before update on api_keys
  for each row execute function set_updated_at();
create trigger trg_webhook_endpoints_updated_at
  before update on webhook_endpoints
  for each row execute function set_updated_at();
create trigger trg_property_sync_settings_updated_at
  before update on property_sync_settings
  for each row execute function set_updated_at();
create trigger trg_agent_feed_settings_updated_at
  before update on agent_feed_settings
  for each row execute function set_updated_at();

-- ---- Seed системных scopes --------------------------------
insert into api_scopes (key, description) values
  ('read:properties', 'List properties available to the agent.'),
  ('read:property_details', 'Read property details.'),
  ('read:property_media', 'Read property media (images, videos).'),
  ('read:property_amenities', 'Read property amenities.'),
  ('read:property_availability', 'Read property availability calendar.'),
  ('read:agent_profile', 'Read the linked agent profile.'),
  ('create:leads', 'Create CRM leads on behalf of the agent.'),
  ('create:booking_request', 'Create booking requests on behalf of the agent.'),
  ('create:showing_request', 'Create showing requests on behalf of the agent.');
