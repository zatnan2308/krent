-- Редактируемый контент страницы /about: тексты (hero, story, pull-quotes)
-- и таблица вех (timeline). Раньше всё было захардкожено в компоненте.

create table if not exists public.about_page (
  organization_id uuid primary key
    references public.organizations(id) on delete cascade,
  hero_title text,
  story_heading text,
  story_body text,
  quote_1 text,
  quote_2 text,
  updated_at timestamptz not null default now()
);

create table if not exists public.about_milestones (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations(id) on delete cascade,
  year text not null default '',
  title text not null default '',
  body text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists about_milestones_org_idx
  on public.about_milestones (organization_id, sort_order);

alter table public.about_page enable row level security;
alter table public.about_milestones enable row level security;

-- Члены организации управляют своим контентом; чтение публичное.
create policy "about_page_member_all" on public.about_page
  for all using (app_private.is_org_member(organization_id))
  with check (app_private.is_org_member(organization_id));
create policy "about_page_public_read" on public.about_page
  for select using (true);

create policy "about_milestones_member_all" on public.about_milestones
  for all using (app_private.is_org_member(organization_id))
  with check (app_private.is_org_member(organization_id));
create policy "about_milestones_public_read" on public.about_milestones
  for select using (true);
