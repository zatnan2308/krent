-- ============================================================
--  Krent: runtime-исполнение автоматизаций (automation flows).
--  Run создаётся при срабатывании триггера (lead.created и т.п.)
--  и продвигается по шагам флоу плановым cron-тиком
--  (/api/cron/automations). Запись — только серверный admin-клиент.
-- ============================================================

create table if not exists public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  automation_flow_id uuid not null references public.automation_flows(id) on delete cascade,
  trigger_event text not null,
  subject_type text,
  subject_id uuid,
  contact_id uuid references public.contacts(id) on delete set null,
  status text not null default 'pending',
  step_index integer not null default 0,
  next_run_at timestamptz not null default now(),
  context jsonb not null default '{}'::jsonb,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_automation_runs_due
  on public.automation_runs (next_run_at)
  where status = 'pending';
create index if not exists idx_automation_runs_org
  on public.automation_runs (organization_id);

alter table public.automation_runs enable row level security;

drop policy if exists "automation_runs_select" on public.automation_runs;
create policy "automation_runs_select"
  on public.automation_runs for select to authenticated
  using (app_private.has_permission(organization_id, 'marketing.manage'));

drop trigger if exists trg_automation_runs_updated_at on public.automation_runs;
create trigger trg_automation_runs_updated_at
  before update on public.automation_runs
  for each row execute function set_updated_at();
