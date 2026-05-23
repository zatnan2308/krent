-- ============================================================
--  Krent: analytics engine. 4 таблицы — сессии посетителей,
--  UTM-touchpoints, события и настройки tracking-интеграций.
--  lead_attribution создана в ЭТАП 9 (CRM) — её здесь не трогаем.
-- ============================================================

-- ---- analytics_sessions (сессии посетителей) --------------
create table analytics_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  session_id text not null,
  user_agent text,
  device text,
  country text,
  city text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  page_view_count integer not null default 0,
  first_landing_page text,
  last_landing_page text,
  referrer text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, session_id)
);
create index idx_analytics_sessions_organization
  on analytics_sessions (organization_id);
create index idx_analytics_sessions_last_seen
  on analytics_sessions (organization_id, last_seen_at desc);

-- ---- utm_sessions (точки касания UTM/click ID) ------------
--  Строка добавляется при каждом приземлении с UTM-параметрами.
--  Первая по captured_at — first-touch, последняя — last-touch.
create table utm_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  session_id text not null,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  gclid text,
  gbraid text,
  wbraid text,
  fbclid text,
  fbc text,
  fbp text,
  landing_page text,
  referrer text,
  captured_at timestamptz not null default now()
);
create index idx_utm_sessions_organization on utm_sessions (organization_id);
create index idx_utm_sessions_session
  on utm_sessions (organization_id, session_id, captured_at);

-- ---- analytics_events (журнал событий) --------------------
create table analytics_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  session_id text,
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  entity_type text,
  entity_id uuid,
  path text,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);
create index idx_analytics_events_org_time
  on analytics_events (organization_id, occurred_at desc);
create index idx_analytics_events_org_type
  on analytics_events (organization_id, event_type);
create index idx_analytics_events_entity
  on analytics_events (organization_id, entity_type, entity_id);

-- ---- tracking_settings (интеграции GA4/GTM/Pixel/Ads) -----
--  meta_capi_token и consent_mode — placeholder под будущее
--  серверное событие Meta CAPI и Google Consent Mode v2.
create table tracking_settings (
  organization_id uuid primary key
    references organizations(id) on delete cascade,
  ga4_measurement_id text,
  gtm_id text,
  ga4_enabled boolean not null default false,
  meta_pixel_id text,
  meta_capi_token text,
  meta_pixel_enabled boolean not null default false,
  google_ads_conversion_id text,
  google_ads_labels jsonb not null default '{}'::jsonb,
  consent_mode_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---- updated_at триггеры ----------------------------------
create trigger trg_analytics_sessions_updated_at
  before update on analytics_sessions
  for each row execute function set_updated_at();
create trigger trg_tracking_settings_updated_at
  before update on tracking_settings
  for each row execute function set_updated_at();
