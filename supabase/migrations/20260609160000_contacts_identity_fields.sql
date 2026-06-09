-- ============================================================
--  Krent CRM — блок A: идентификация и контакты клиента.
--  Расширяет карточку контакта полями, нужными риэлтору: тип
--  (физлицо/компания), доп. контакты, предпочитаемый канал/время связи,
--  адрес, дата рождения, «кто привёл» (referral) и связанные лица.
-- ============================================================

alter table public.contacts
  add column if not exists contact_kind text not null default 'person',
  add column if not exists company_name text,
  add column if not exists job_title text,
  add column if not exists secondary_phone text,
  add column if not exists secondary_email text,
  add column if not exists preferred_channel text,
  add column if not exists best_time_to_contact text,
  add column if not exists address_line text,
  add column if not exists city text,
  add column if not exists postal_code text,
  add column if not exists country text,
  add column if not exists date_of_birth date,
  add column if not exists referred_by_contact_id uuid
    references public.contacts(id) on delete set null,
  add column if not exists referral_note text;

create index if not exists idx_contacts_referred_by
  on public.contacts (referred_by_contact_id);

-- Связанные лица (супруг/со-покупатель/созаёмщик и т.п.). Может ссылаться на
-- другой контакт организации (real link) либо хранить просто имя.
create table if not exists public.contact_relationships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  related_contact_id uuid references public.contacts(id) on delete set null,
  related_name text,
  relationship_type text not null default 'other',
  created_at timestamptz not null default now()
);
create index if not exists idx_contact_relationships_contact
  on public.contact_relationships (contact_id);

alter table public.contact_relationships enable row level security;
drop policy if exists "contact_relationships_select" on public.contact_relationships;
create policy "contact_relationships_select"
  on public.contact_relationships for select to authenticated
  using (app_private.has_permission(organization_id, 'crm.view'));
drop policy if exists "contact_relationships_write" on public.contact_relationships;
create policy "contact_relationships_write"
  on public.contact_relationships for all to authenticated
  using (app_private.has_permission(organization_id, 'crm.manage'))
  with check (app_private.has_permission(organization_id, 'crm.manage'));
