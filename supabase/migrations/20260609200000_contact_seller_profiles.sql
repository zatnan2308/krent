-- ============================================================
--  Krent CRM — блок E: профиль продавца (1:1 с контактом).
--  Объект на продажу: адрес/характеристики, ожидаемая цена, остаток
--  ипотеки, HOA, причина и сроки продажи, встречная покупка, договор.
-- ============================================================

create table if not exists public.contact_seller_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contact_id uuid not null unique references public.contacts(id) on delete cascade,
  address text,
  property_type text,
  beds integer,
  baths numeric(4, 1),
  area numeric(12, 2),
  year_built integer,
  expected_price numeric(14, 2),
  mortgage_balance numeric(14, 2),
  hoa_fees numeric(12, 2),
  reason text,
  timeline text,
  needs_counter_purchase boolean not null default false,
  contract_type text,
  commission_note text,
  currency text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_contact_seller_profiles_contact
  on public.contact_seller_profiles (contact_id);

alter table public.contact_seller_profiles enable row level security;
drop policy if exists "contact_seller_profiles_select" on public.contact_seller_profiles;
create policy "contact_seller_profiles_select"
  on public.contact_seller_profiles for select to authenticated
  using (app_private.has_permission(organization_id, 'crm.view'));
drop policy if exists "contact_seller_profiles_write" on public.contact_seller_profiles;
create policy "contact_seller_profiles_write"
  on public.contact_seller_profiles for all to authenticated
  using (app_private.has_permission(organization_id, 'crm.manage'))
  with check (app_private.has_permission(organization_id, 'crm.manage'));

drop trigger if exists trg_contact_seller_profiles_updated_at on public.contact_seller_profiles;
create trigger trg_contact_seller_profiles_updated_at
  before update on public.contact_seller_profiles
  for each row execute function set_updated_at();
