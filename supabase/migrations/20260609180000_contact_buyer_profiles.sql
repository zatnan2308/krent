-- ============================================================
--  Krent CRM — блок C: финансовый профиль покупателя (1:1 с контактом).
--  Способ оплаты, пред-одобрение (сумма/банк), первоначальный взнос,
--  необходимость сначала продать текущее жильё, текущее жильё.
--  Блок D дополнит эту же таблицу параметрами поиска объекта.
-- ============================================================

create table if not exists public.contact_buyer_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contact_id uuid not null unique references public.contacts(id) on delete cascade,
  payment_method text,
  preapproval_status text,
  preapproval_amount numeric(14, 2),
  lender_name text,
  down_payment numeric(14, 2),
  needs_to_sell_first boolean not null default false,
  current_housing text,
  currency text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_contact_buyer_profiles_contact
  on public.contact_buyer_profiles (contact_id);

alter table public.contact_buyer_profiles enable row level security;
drop policy if exists "contact_buyer_profiles_select" on public.contact_buyer_profiles;
create policy "contact_buyer_profiles_select"
  on public.contact_buyer_profiles for select to authenticated
  using (app_private.has_permission(organization_id, 'crm.view'));
drop policy if exists "contact_buyer_profiles_write" on public.contact_buyer_profiles;
create policy "contact_buyer_profiles_write"
  on public.contact_buyer_profiles for all to authenticated
  using (app_private.has_permission(organization_id, 'crm.manage'))
  with check (app_private.has_permission(organization_id, 'crm.manage'));

drop trigger if exists trg_contact_buyer_profiles_updated_at on public.contact_buyer_profiles;
create trigger trg_contact_buyer_profiles_updated_at
  before update on public.contact_buyer_profiles
  for each row execute function set_updated_at();
