-- ============================================================
--  Krent: интеграции с маркетинговыми платформами. 8 таблиц —
--  generic OAuth-подключения, отдельные строки для GSC/Google
--  Ads/Meta Ads (специфичные поля), шифрованные токены, отчёты
--  ad campaigns, SEO-отчёты и SEO-возможности.
--
--  Заметка: ad_campaign_reports — переименована из campaign_reports
--  спецификации, так как имя campaign_reports уже занято таблицей
--  email-кампаний из ЭТАП 15.
-- ============================================================

create type integration_provider as enum (
  'gsc',
  'google_ads',
  'meta_ads'
);
create type integration_status as enum (
  'pending',
  'connected',
  'disconnected',
  'error'
);

-- ---- integration_connections (generic OAuth-метаданные) ---
create table integration_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  provider integration_provider not null,
  account_id text,
  display_name text,
  scopes text[] not null default '{}'::text[],
  status integration_status not null default 'pending',
  error_message text,
  last_synced_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider, account_id)
);
create index idx_integration_connections_organization
  on integration_connections (organization_id);

-- ---- google_search_console_connections --------------------
create table google_search_console_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  integration_connection_id uuid not null
    references integration_connections(id) on delete cascade,
  site_url text not null,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_gsc_connections_organization
  on google_search_console_connections (organization_id);

-- ---- google_ads_connections -------------------------------
create table google_ads_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  integration_connection_id uuid not null
    references integration_connections(id) on delete cascade,
  customer_id text not null,
  manager_customer_id text,
  currency text,
  created_at timestamptz not null default now()
);
create index idx_google_ads_connections_organization
  on google_ads_connections (organization_id);

-- ---- meta_ads_connections ---------------------------------
create table meta_ads_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  integration_connection_id uuid not null
    references integration_connections(id) on delete cascade,
  ad_account_id text not null,
  business_id text,
  currency text,
  created_at timestamptz not null default now()
);
create index idx_meta_ads_connections_organization
  on meta_ads_connections (organization_id);

-- ---- integration_tokens (шифрованные токены) --------------
--  encrypted_value сейчас обёрнут placeholder-шифрованием
--  (см. lib/encryption). Реальная криптография подключается
--  отдельным этапом.
create table integration_tokens (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  integration_connection_id uuid not null
    references integration_connections(id) on delete cascade,
  token_type text not null,
  encrypted_value text not null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_integration_tokens_connection
  on integration_tokens (integration_connection_id);

-- ---- ad_campaign_reports (отчёты рекламных кампаний) ------
create table ad_campaign_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  provider integration_provider not null,
  external_campaign_id text not null,
  name text not null,
  level text not null default 'campaign',
  parent_id text,
  date date not null,
  impressions bigint not null default 0,
  clicks bigint not null default 0,
  spend numeric(14, 2) not null default 0,
  conversions bigint not null default 0,
  leads bigint not null default 0,
  currency text not null default 'USD',
  created_at timestamptz not null default now()
);
create index idx_ad_campaign_reports_org_date
  on ad_campaign_reports (organization_id, date desc);
create index idx_ad_campaign_reports_provider
  on ad_campaign_reports (organization_id, provider, date desc);

-- ---- seo_reports (срезы Search Console) -------------------
create table seo_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  integration_connection_id uuid
    references integration_connections(id) on delete cascade,
  date date not null,
  clicks bigint not null default 0,
  impressions bigint not null default 0,
  ctr numeric(6, 4) not null default 0,
  position numeric(6, 2) not null default 0,
  dimension text,
  dimension_value text,
  created_at timestamptz not null default now()
);
create index idx_seo_reports_org_date
  on seo_reports (organization_id, date desc);
create index idx_seo_reports_dimension
  on seo_reports (organization_id, dimension, date desc);

-- ---- seo_opportunities (рекомендации по SEO) --------------
create table seo_opportunities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  integration_connection_id uuid
    references integration_connections(id) on delete cascade,
  opportunity_type text not null,
  query text,
  page text,
  impressions bigint not null default 0,
  clicks bigint not null default 0,
  position numeric(6, 2),
  recommendation text,
  created_at timestamptz not null default now()
);
create index idx_seo_opportunities_org
  on seo_opportunities (organization_id, created_at desc);

-- ---- updated_at триггеры ----------------------------------
create trigger trg_integration_connections_updated_at
  before update on integration_connections
  for each row execute function set_updated_at();
create trigger trg_integration_tokens_updated_at
  before update on integration_tokens
  for each row execute function set_updated_at();
