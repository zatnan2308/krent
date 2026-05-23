-- ============================================================
--  Krent: CRM-модуль. 10 таблиц — контакты, лиды, источники,
--  сделки, стадии, задачи, заметки, атрибуция, сохранённые
--  поиски, избранное. Каждая таблица несёт organization_id.
-- ============================================================

create type lead_type as enum (
  'buyer',
  'seller',
  'renter',
  'guest',
  'investor',
  'commercial',
  'booking',
  'valuation',
  'external_agent_website'
);
create type lead_status as enum (
  'new',
  'contacted',
  'qualified',
  'unqualified',
  'converted',
  'lost'
);
create type deal_status as enum ('open', 'won', 'lost');
create type task_status as enum ('open', 'completed', 'cancelled');
create type task_priority as enum ('low', 'medium', 'high');
create type device_type as enum ('desktop', 'mobile', 'tablet', 'unknown');

-- ---- contacts ---------------------------------------------
create table contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  assigned_agent_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  email text,
  phone text,
  preferred_language text,
  preferred_currency text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index contacts_org_email_uniq
  on contacts (organization_id, lower(email)) where email is not null;
create index idx_contacts_organization on contacts (organization_id);

-- ---- lead_sources (системные + кастомные) -----------------
create table lead_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  key text not null check (key ~ '^[a-z0-9_]+$'),
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create unique index lead_sources_system_key
  on lead_sources (key) where organization_id is null;
create unique index lead_sources_org_key
  on lead_sources (organization_id, key) where organization_id is not null;

-- ---- leads ------------------------------------------------
create table leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  assigned_agent_id uuid references auth.users(id) on delete set null,
  contact_id uuid not null references contacts(id) on delete cascade,
  property_id uuid references properties(id) on delete set null,
  type lead_type not null default 'buyer',
  status lead_status not null default 'new',
  source text,
  source_domain text,
  message text,
  budget_min numeric(14, 2) check (budget_min is null or budget_min >= 0),
  budget_max numeric(14, 2) check (budget_max is null or budget_max >= 0),
  location_interest text,
  language text,
  currency text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_leads_organization on leads (organization_id);
create index idx_leads_org_status on leads (organization_id, status);
create index idx_leads_agent on leads (assigned_agent_id);
create index idx_leads_contact on leads (contact_id);
create index idx_leads_property on leads (property_id);

-- ---- deal_stages (системные + кастомные) ------------------
create table deal_stages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  key text not null check (key ~ '^[a-z0-9_]+$'),
  name text not null,
  sort_order integer not null default 0,
  is_won boolean not null default false,
  is_lost boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index deal_stages_system_key
  on deal_stages (key) where organization_id is null;
create unique index deal_stages_org_key
  on deal_stages (organization_id, key) where organization_id is not null;

-- ---- deals ------------------------------------------------
create table deals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  assigned_agent_id uuid references auth.users(id) on delete set null,
  contact_id uuid not null references contacts(id) on delete cascade,
  lead_id uuid references leads(id) on delete set null,
  property_id uuid references properties(id) on delete set null,
  stage_id uuid references deal_stages(id) on delete set null,
  title text not null,
  amount numeric(14, 2) check (amount is null or amount >= 0),
  currency text,
  status deal_status not null default 'open',
  expected_close_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_deals_organization on deals (organization_id);
create index idx_deals_agent on deals (assigned_agent_id);
create index idx_deals_stage on deals (stage_id);
create index idx_deals_contact on deals (contact_id);

-- ---- tasks ------------------------------------------------
create table tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  assigned_agent_id uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  contact_id uuid references contacts(id) on delete cascade,
  lead_id uuid references leads(id) on delete cascade,
  deal_id uuid references deals(id) on delete cascade,
  title text not null,
  description text,
  due_date date,
  status task_status not null default 'open',
  priority task_priority not null default 'medium',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_tasks_organization on tasks (organization_id);
create index idx_tasks_agent on tasks (assigned_agent_id);
create index idx_tasks_lead on tasks (lead_id);

-- ---- notes ------------------------------------------------
create table notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  contact_id uuid references contacts(id) on delete cascade,
  lead_id uuid references leads(id) on delete cascade,
  deal_id uuid references deals(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create index idx_notes_organization on notes (organization_id);
create index idx_notes_lead on notes (lead_id);
create index idx_notes_contact on notes (contact_id);
create index idx_notes_deal on notes (deal_id);

-- ---- lead_attribution (1:1 с лидом) -----------------------
create table lead_attribution (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  lead_id uuid not null unique references leads(id) on delete cascade,
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
  first_page text,
  last_page text,
  referrer text,
  device device_type not null default 'unknown',
  country text,
  city text,
  created_at timestamptz not null default now()
);
create index idx_lead_attribution_organization
  on lead_attribution (organization_id);

-- ---- saved_searches ---------------------------------------
create table saved_searches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  contact_id uuid references contacts(id) on delete cascade,
  name text not null,
  query jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index idx_saved_searches_organization
  on saved_searches (organization_id);

-- ---- favorite_properties ----------------------------------
create table favorite_properties (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  contact_id uuid references contacts(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (contact_id, property_id)
);
create index idx_favorite_properties_organization
  on favorite_properties (organization_id);

-- ---- updated_at триггеры ----------------------------------
create trigger trg_contacts_updated_at before update on contacts
  for each row execute function set_updated_at();
create trigger trg_leads_updated_at before update on leads
  for each row execute function set_updated_at();
create trigger trg_deals_updated_at before update on deals
  for each row execute function set_updated_at();
create trigger trg_tasks_updated_at before update on tasks
  for each row execute function set_updated_at();
