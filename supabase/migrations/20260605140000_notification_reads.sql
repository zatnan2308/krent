-- Серверная отметка «последний просмотр уведомлений» на пользователя+организацию
-- (вместо одного localStorage-таймстемпа на браузер). Кросс-девайс.
create table if not exists public.notification_reads (
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  primary key (user_id, organization_id)
);

alter table public.notification_reads enable row level security;

create policy "notification_reads_select"
  on public.notification_reads for select to authenticated
  using (user_id = (select auth.uid()));

create policy "notification_reads_write"
  on public.notification_reads for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
