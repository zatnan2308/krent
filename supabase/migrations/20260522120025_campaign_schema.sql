-- ============================================================
--  Krent: email-кампании и конструктор рассылок. 11 таблиц —
--  сегменты контактов и их состав, согласия на маркетинг,
--  кампании, шаблоны и блоки, получатели и отчёты, отписки,
--  заготовки автоматизаций (flows / steps).
-- ============================================================

create type campaign_status as enum (
  'draft',
  'scheduled',
  'sending',
  'sent',
  'failed'
);
create type campaign_recipient_status as enum (
  'pending',
  'sent',
  'failed',
  'skipped'
);
create type consent_status as enum ('granted', 'withdrawn');

-- ---- contact_segments (сегменты аудитории) ----------------
--  definition — правило динамического сегмента:
--  { rule: all|lead_type|channel|language|currency|city|property_type,
--    value: text }. Состав материализуется в contact_segment_members.
create table contact_segments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text,
  definition jsonb not null default '{}'::jsonb,
  is_system boolean not null default false,
  last_refreshed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_contact_segments_organization
  on contact_segments (organization_id);

-- ---- contact_segment_members (материализованный состав) ----
create table contact_segment_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  segment_id uuid not null references contact_segments(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (segment_id, contact_id)
);
create index idx_contact_segment_members_segment
  on contact_segment_members (segment_id);
create index idx_contact_segment_members_organization
  on contact_segment_members (organization_id);

-- ---- contact_consents (согласия на маркетинг) -------------
create table contact_consents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  consent_type text not null default 'marketing',
  status consent_status not null default 'granted',
  source text,
  granted_at timestamptz,
  withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (contact_id, consent_type)
);
create index idx_contact_consents_organization
  on contact_consents (organization_id);
create index idx_contact_consents_contact
  on contact_consents (contact_id);

-- ---- campaign_templates (стартовые раскладки) -------------
--  organization_id null — системный шаблон.
create table campaign_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  name text not null,
  description text,
  blocks jsonb not null default '[]'::jsonb,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_campaign_templates_organization
  on campaign_templates (organization_id);

-- ---- campaigns --------------------------------------------
create table campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  segment_id uuid references contact_segments(id) on delete set null,
  name text not null,
  subject text not null default '',
  preview_text text not null default '',
  language text not null default 'en',
  sender_name text not null default '',
  status campaign_status not null default 'draft',
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_campaigns_organization on campaigns (organization_id);
create index idx_campaigns_status on campaigns (organization_id, status);

-- ---- campaign_blocks (блоки письма кампании) --------------
create table campaign_blocks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  campaign_id uuid not null references campaigns(id) on delete cascade,
  sort_order integer not null default 0,
  block_type text not null,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index idx_campaign_blocks_campaign on campaign_blocks (campaign_id);
create index idx_campaign_blocks_organization
  on campaign_blocks (organization_id);

-- ---- campaign_recipients ----------------------------------
create table campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  campaign_id uuid not null references campaigns(id) on delete cascade,
  contact_id uuid references contacts(id) on delete set null,
  email text not null,
  status campaign_recipient_status not null default 'pending',
  reason text,
  unsubscribe_token text not null,
  email_send_id uuid,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_campaign_recipients_campaign
  on campaign_recipients (campaign_id);
create index idx_campaign_recipients_organization
  on campaign_recipients (organization_id);
create unique index campaign_recipients_token
  on campaign_recipients (unsubscribe_token);

-- ---- campaign_reports (агрегированная статистика) ---------
create table campaign_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  campaign_id uuid not null unique references campaigns(id) on delete cascade,
  total_recipients integer not null default 0,
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  skipped_count integer not null default 0,
  delivered_count integer not null default 0,
  opened_count integer not null default 0,
  clicked_count integer not null default 0,
  unsubscribed_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_campaign_reports_organization
  on campaign_reports (organization_id);

-- ---- email_unsubscribes (журнал отписок) ------------------
create table email_unsubscribes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  contact_id uuid references contacts(id) on delete set null,
  campaign_id uuid references campaigns(id) on delete set null,
  email text not null,
  source text,
  created_at timestamptz not null default now()
);
create index idx_email_unsubscribes_organization
  on email_unsubscribes (organization_id);
create index idx_email_unsubscribes_email
  on email_unsubscribes (organization_id, lower(email));

-- ---- automation_flows (заготовка автоматизаций) -----------
create table automation_flows (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text,
  trigger_event text,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_automation_flows_organization
  on automation_flows (organization_id);

-- ---- automation_steps -------------------------------------
create table automation_steps (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  automation_flow_id uuid not null
    references automation_flows(id) on delete cascade,
  sort_order integer not null default 0,
  step_type text not null,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index idx_automation_steps_flow
  on automation_steps (automation_flow_id);
create index idx_automation_steps_organization
  on automation_steps (organization_id);

-- ---- updated_at триггеры ----------------------------------
create trigger trg_contact_segments_updated_at
  before update on contact_segments
  for each row execute function set_updated_at();
create trigger trg_contact_consents_updated_at
  before update on contact_consents
  for each row execute function set_updated_at();
create trigger trg_campaign_templates_updated_at
  before update on campaign_templates
  for each row execute function set_updated_at();
create trigger trg_campaigns_updated_at before update on campaigns
  for each row execute function set_updated_at();
create trigger trg_campaign_reports_updated_at
  before update on campaign_reports
  for each row execute function set_updated_at();
create trigger trg_automation_flows_updated_at
  before update on automation_flows
  for each row execute function set_updated_at();
