-- ============================================================
--  Krent: запланированное время показа/встречи для лида.
--  Используется порталом покупателя (раздел Appointments) и
--  задаётся агентом в карточке лида.
-- ============================================================

alter table public.leads
  add column if not exists scheduled_at timestamptz;

comment on column public.leads.scheduled_at is
  'Запланированное время показа/встречи; показывается в портале покупателя (Appointments).';

create index if not exists idx_leads_scheduled_at
  on public.leads (scheduled_at)
  where scheduled_at is not null;
