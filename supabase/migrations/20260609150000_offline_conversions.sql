-- ============================================================
--  Krent: очередь оффлайн-конверсий для рекламных платформ.
--  Ставится при закрытии сделки (deal won) и обрабатывается плановым
--  тиком (/api/cron/integrations-sync), который зовёт provider-адаптер
--  (Google Ads / Meta) с click id (gclid/fbclid) из атрибуции лида.
-- ============================================================

create table if not exists public.offline_conversions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  deal_id uuid references public.deals(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  conversion_type text not null,
  click_source text,
  click_id text,
  value numeric(14, 2),
  currency text,
  occurred_at timestamptz not null default now(),
  status text not null default 'pending',
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_offline_conversions_pending
  on public.offline_conversions (status)
  where status = 'pending';
create index if not exists idx_offline_conversions_org
  on public.offline_conversions (organization_id);
create unique index if not exists uq_offline_conversions_deal_type
  on public.offline_conversions (deal_id, conversion_type)
  where deal_id is not null;

alter table public.offline_conversions enable row level security;

drop policy if exists "offline_conversions_select" on public.offline_conversions;
create policy "offline_conversions_select"
  on public.offline_conversions for select to authenticated
  using (app_private.has_permission(organization_id, 'analytics.view'));

drop trigger if exists trg_offline_conversions_updated_at on public.offline_conversions;
create trigger trg_offline_conversions_updated_at
  before update on public.offline_conversions
  for each row execute function set_updated_at();
