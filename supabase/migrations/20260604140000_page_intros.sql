-- Редактируемые вступительные блоки фиксированных страниц (sell, agents, …):
-- eyebrow + заголовок + подзаголовок. По одной строке на (организация, ключ).
create table if not exists public.page_intros (
  organization_id uuid not null
    references public.organizations(id) on delete cascade,
  page_key text not null,
  eyebrow text,
  heading text,
  subheading text,
  updated_at timestamptz not null default now(),
  primary key (organization_id, page_key)
);

alter table public.page_intros enable row level security;

create policy "page_intros_member_all" on public.page_intros
  for all using (app_private.is_org_member(organization_id))
  with check (app_private.is_org_member(organization_id));
create policy "page_intros_public_read" on public.page_intros
  for select using (true);
