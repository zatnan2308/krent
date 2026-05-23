-- ============================================================
--  Krent: Notification Center и транзакционные письма. 8 таблиц —
--  каталог событий и email-шаблоны, настройки уведомлений,
--  события и логи доставки, отправленные письма, отказы и жалобы.
-- ============================================================

create type notification_event_status as enum (
  'pending',
  'processing',
  'processed',
  'failed'
);
create type notification_delivery_status as enum (
  'sent',
  'skipped',
  'failed'
);
create type email_send_status as enum ('queued', 'sent', 'failed');

-- ---- notification_templates (системный каталог событий) ---
--  Маршрутизация: тип события -> аудитория, признак транзакционного
--  письма (игнорирует preferences). Только системные строки.
create table notification_templates (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  audience text not null default 'recipient',
  is_transactional boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---- email_templates (контент письма) ---------------------
--  organization_id null — системный шаблон; строка организации
--  переопределяет системный по ключу.
create table email_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  key text not null,
  name text not null,
  subject text not null,
  body_html text not null,
  body_text text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index email_templates_system_key
  on email_templates (key) where organization_id is null;
create unique index email_templates_org_key
  on email_templates (organization_id, key)
  where organization_id is not null;
create index idx_email_templates_organization
  on email_templates (organization_id);

-- ---- notification_preferences -----------------------------
--  user_id null — настройка уровня организации; иначе — пользователя.
create table notification_preferences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  event_type text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index notification_preferences_org_event
  on notification_preferences (organization_id, event_type)
  where user_id is null;
create unique index notification_preferences_user_event
  on notification_preferences (organization_id, user_id, event_type)
  where user_id is not null;

-- ---- notification_events (очередь событий) ----------------
create table notification_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  event_type text not null,
  entity_type text,
  entity_id uuid,
  payload jsonb not null default '{}'::jsonb,
  status notification_event_status not null default 'pending',
  error text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_notification_events_organization
  on notification_events (organization_id);
create index idx_notification_events_status
  on notification_events (status);

-- ---- notification_logs (доставка по получателю) -----------
create table notification_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  notification_event_id uuid
    references notification_events(id) on delete cascade,
  event_type text not null,
  recipient_email text not null,
  recipient_user_id uuid,
  status notification_delivery_status not null,
  reason text,
  email_send_id uuid,
  created_at timestamptz not null default now()
);
create index idx_notification_logs_organization
  on notification_logs (organization_id);
create index idx_notification_logs_event
  on notification_logs (notification_event_id);

-- ---- email_sends (отправленные письма) --------------------
create table email_sends (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  notification_event_id uuid
    references notification_events(id) on delete set null,
  template_key text,
  to_email text not null,
  subject text not null,
  status email_send_status not null default 'queued',
  provider text not null default 'resend',
  provider_message_id text,
  provider_response jsonb not null default '{}'::jsonb,
  error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_email_sends_organization on email_sends (organization_id);
create index idx_email_sends_message
  on email_sends (provider_message_id);

-- ---- email_bounces (отказы доставки) ----------------------
create table email_bounces (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete set null,
  email_send_id uuid references email_sends(id) on delete set null,
  email text not null,
  bounce_type text,
  provider_message_id text,
  payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now()
);
create index idx_email_bounces_organization
  on email_bounces (organization_id);

-- ---- email_complaints (жалобы на спам) --------------------
create table email_complaints (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete set null,
  email_send_id uuid references email_sends(id) on delete set null,
  email text not null,
  provider_message_id text,
  payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now()
);
create index idx_email_complaints_organization
  on email_complaints (organization_id);

-- ---- updated_at триггеры ----------------------------------
create trigger trg_notification_templates_updated_at
  before update on notification_templates
  for each row execute function set_updated_at();
create trigger trg_email_templates_updated_at
  before update on email_templates
  for each row execute function set_updated_at();
create trigger trg_notification_preferences_updated_at
  before update on notification_preferences
  for each row execute function set_updated_at();
create trigger trg_notification_events_updated_at
  before update on notification_events
  for each row execute function set_updated_at();
create trigger trg_email_sends_updated_at before update on email_sends
  for each row execute function set_updated_at();
