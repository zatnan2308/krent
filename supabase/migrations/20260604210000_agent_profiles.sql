-- ============================================================
--  Krent: профили агентов
--  Публичная карточка агента (title, bio, phone, RERA, специализация,
--  фото) поверх auth.users. 1:1 с участником организации; редактируется
--  владельцем (self-service). Публичный сайт читает сервис-клиентом.
-- ============================================================

create table public.agent_profiles (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  bio text,
  phone text,
  rera_number text,
  specialization text,
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create index idx_agent_profiles_organization on public.agent_profiles (organization_id);

alter table public.agent_profiles enable row level security;

-- Чтение: любой участник организации.
create policy "agent_profiles_select_member"
  on public.agent_profiles for select to authenticated
  using (app_private.is_org_member(organization_id));

-- Запись: только свой профиль внутри своей организации.
create policy "agent_profiles_insert_self"
  on public.agent_profiles for insert to authenticated
  with check (user_id = auth.uid() and app_private.is_org_member(organization_id));

create policy "agent_profiles_update_self"
  on public.agent_profiles for update to authenticated
  using (user_id = auth.uid() and app_private.is_org_member(organization_id))
  with check (user_id = auth.uid() and app_private.is_org_member(organization_id));

create policy "agent_profiles_delete_self"
  on public.agent_profiles for delete to authenticated
  using (user_id = auth.uid() and app_private.is_org_member(organization_id));

create trigger trg_agent_profiles_updated_at
  before update on public.agent_profiles
  for each row execute function public.set_updated_at();
