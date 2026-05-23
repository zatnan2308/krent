-- ============================================================
--  Krent: календарь аренды и iCal-синхронизация. 7 таблиц —
--  календари, события, правила доступности и цен, источники
--  импорта iCal, логи синхронизации, токены экспорта.
-- ============================================================

create type calendar_event_source as enum (
  'manual',
  'direct',
  'airbnb',
  'booking',
  'vrbo',
  'google',
  'owner',
  'maintenance',
  'cleaning'
);
create type calendar_event_status as enum (
  'available',
  'booked',
  'blocked',
  'pending',
  'maintenance',
  'cleaning'
);
create type ical_provider as enum (
  'airbnb',
  'booking',
  'vrbo',
  'google',
  'custom'
);
create type ical_sync_status as enum ('success', 'error', 'partial');

-- ---- rental_calendars (1:1 с объектом) --------------------
create table rental_calendars (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  property_id uuid not null unique references properties(id) on delete cascade,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_rental_calendars_organization
  on rental_calendars (organization_id);

-- ---- rental_calendar_events -------------------------------
create table rental_calendar_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  calendar_id uuid not null references rental_calendars(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  import_source_id uuid,
  source calendar_event_source not null default 'manual',
  status calendar_event_status not null default 'blocked',
  start_date date not null,
  end_date date not null,
  title text,
  external_uid text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date > start_date)
);
create index idx_rental_calendar_events_calendar
  on rental_calendar_events (calendar_id);
create index idx_rental_calendar_events_property
  on rental_calendar_events (property_id);
create index idx_rental_calendar_events_dates
  on rental_calendar_events (property_id, start_date, end_date);
create index idx_rental_calendar_events_organization
  on rental_calendar_events (organization_id);
create index idx_rental_calendar_events_import
  on rental_calendar_events (import_source_id);

-- ---- rental_availability_rules (1:1 с календарём) ---------
create table rental_availability_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  calendar_id uuid not null unique
    references rental_calendars(id) on delete cascade,
  min_stay integer not null default 1 check (min_stay >= 1),
  max_stay integer check (max_stay is null or max_stay >= 1),
  check_in_days integer[] not null default '{0,1,2,3,4,5,6}'::integer[],
  check_out_days integer[] not null default '{0,1,2,3,4,5,6}'::integer[],
  buffer_days integer not null default 0 check (buffer_days >= 0),
  default_price numeric(12, 2) check (default_price is null or default_price >= 0),
  weekend_price numeric(12, 2) check (weekend_price is null or weekend_price >= 0),
  currency text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_rental_availability_rules_organization
  on rental_availability_rules (organization_id);

-- ---- rental_price_rules -----------------------------------
create table rental_price_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  calendar_id uuid not null references rental_calendars(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  price numeric(12, 2) not null check (price >= 0),
  currency text not null,
  min_stay integer check (min_stay is null or min_stay >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);
create index idx_rental_price_rules_calendar
  on rental_price_rules (calendar_id);
create index idx_rental_price_rules_organization
  on rental_price_rules (organization_id);

-- ---- ical_import_sources ----------------------------------
create table ical_import_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  calendar_id uuid not null references rental_calendars(id) on delete cascade,
  name text not null,
  provider ical_provider not null default 'custom',
  url text not null,
  is_active boolean not null default true,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_ical_import_sources_calendar
  on ical_import_sources (calendar_id);
create index idx_ical_import_sources_organization
  on ical_import_sources (organization_id);

-- FK событий на источник импорта (после создания таблицы источников).
alter table rental_calendar_events
  add constraint rental_calendar_events_import_source_fkey
  foreign key (import_source_id)
  references ical_import_sources(id) on delete set null;

-- Дедупликация импортированных событий при повторной синхронизации.
create unique index rental_calendar_events_import_uid
  on rental_calendar_events (import_source_id, external_uid)
  where import_source_id is not null and external_uid is not null;

-- ---- ical_sync_logs ---------------------------------------
create table ical_sync_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  import_source_id uuid not null
    references ical_import_sources(id) on delete cascade,
  status ical_sync_status not null,
  events_imported integer not null default 0,
  message text,
  created_at timestamptz not null default now()
);
create index idx_ical_sync_logs_source on ical_sync_logs (import_source_id);
create index idx_ical_sync_logs_organization
  on ical_sync_logs (organization_id);

-- ---- ical_export_tokens -----------------------------------
create table ical_export_tokens (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  calendar_id uuid not null references rental_calendars(id) on delete cascade,
  token text not null unique,
  is_active boolean not null default true,
  last_accessed_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_ical_export_tokens_calendar
  on ical_export_tokens (calendar_id);
create index idx_ical_export_tokens_organization
  on ical_export_tokens (organization_id);

-- ---- updated_at триггеры ----------------------------------
create trigger trg_rental_calendars_updated_at before update on rental_calendars
  for each row execute function set_updated_at();
create trigger trg_rental_calendar_events_updated_at
  before update on rental_calendar_events
  for each row execute function set_updated_at();
create trigger trg_rental_availability_rules_updated_at
  before update on rental_availability_rules
  for each row execute function set_updated_at();
create trigger trg_rental_price_rules_updated_at
  before update on rental_price_rules
  for each row execute function set_updated_at();
create trigger trg_ical_import_sources_updated_at
  before update on ical_import_sources
  for each row execute function set_updated_at();
