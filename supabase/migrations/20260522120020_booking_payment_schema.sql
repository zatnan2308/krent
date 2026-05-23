-- ============================================================
--  Krent: прямое бронирование и абстракция платежей. 9 таблиц —
--  бронирования, гости, сборы, платежи аренды, провайдеры и
--  аккаунты платежей, транзакции, вебхуки, возвраты.
--
--  Важно: секреты платёжных провайдеров (secret key, webhook
--  secret) НЕ хранятся в БД — они резолвятся из окружения на
--  сервере. В payment_accounts лежат только публичные данные.
-- ============================================================

create type booking_status as enum (
  'draft',
  'pending',
  'confirmed',
  'cancelled',
  'completed'
);
create type booking_source as enum (
  'website',
  'agent',
  'airbnb_import',
  'booking_import'
);
create type booking_payment_status as enum (
  'unpaid',
  'partially_paid',
  'paid',
  'refunded',
  'partially_refunded'
);
create type rental_fee_kind as enum (
  'accommodation',
  'cleaning',
  'security_deposit',
  'tax',
  'discount',
  'service',
  'other'
);
create type payment_provider_type as enum (
  'stripe',
  'paypal',
  'crypto',
  'manual'
);
create type payment_provider_mode as enum ('test', 'live');
create type payment_status as enum (
  'pending',
  'processing',
  'succeeded',
  'failed',
  'cancelled',
  'refunded'
);
create type payment_purpose as enum (
  'booking_deposit',
  'booking_balance',
  'booking_total',
  'security_deposit'
);
create type payment_transaction_kind as enum ('charge', 'refund');
create type refund_status as enum (
  'pending',
  'processing',
  'succeeded',
  'failed'
);

-- ---- rental_bookings --------------------------------------
create table rental_bookings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  calendar_id uuid references rental_calendars(id) on delete set null,
  calendar_event_id uuid
    references rental_calendar_events(id) on delete set null,
  guest_contact_id uuid references contacts(id) on delete set null,
  lead_id uuid references leads(id) on delete set null,
  reference text not null unique,
  check_in date not null,
  check_out date not null,
  nights integer not null check (nights >= 1),
  adults integer not null default 1 check (adults >= 1),
  children integer not null default 0 check (children >= 0),
  pets integer not null default 0 check (pets >= 0),
  status booking_status not null default 'pending',
  source booking_source not null default 'website',
  subtotal numeric(12, 2) not null default 0 check (subtotal >= 0),
  cleaning_fee numeric(12, 2) not null default 0 check (cleaning_fee >= 0),
  security_deposit numeric(12, 2) not null default 0
    check (security_deposit >= 0),
  taxes numeric(12, 2) not null default 0 check (taxes >= 0),
  discount numeric(12, 2) not null default 0 check (discount >= 0),
  total numeric(12, 2) not null default 0 check (total >= 0),
  currency text not null default 'USD',
  payment_status booking_payment_status not null default 'unpaid',
  promo_code text,
  guest_name text,
  guest_email text,
  guest_phone text,
  guest_message text,
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (check_out > check_in)
);
create index idx_rental_bookings_organization
  on rental_bookings (organization_id);
create index idx_rental_bookings_property on rental_bookings (property_id);
create index idx_rental_bookings_status
  on rental_bookings (organization_id, status);
create index idx_rental_bookings_calendar on rental_bookings (calendar_id);
create index idx_rental_bookings_contact
  on rental_bookings (guest_contact_id);
create index idx_rental_bookings_lead on rental_bookings (lead_id);

-- ---- rental_guests (роспись гостей бронирования) ----------
create table rental_guests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  booking_id uuid not null references rental_bookings(id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  is_primary boolean not null default false,
  guest_category text not null default 'adult',
  created_at timestamptz not null default now()
);
create index idx_rental_guests_booking on rental_guests (booking_id);
create index idx_rental_guests_organization
  on rental_guests (organization_id);

-- ---- rental_fees (строки расчёта стоимости бронирования) --
create table rental_fees (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  booking_id uuid not null references rental_bookings(id) on delete cascade,
  kind rental_fee_kind not null,
  label text not null,
  -- Скидка хранится отрицательной суммой — поэтому без check (amount >= 0).
  amount numeric(12, 2) not null default 0,
  currency text not null,
  is_refundable boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index idx_rental_fees_booking on rental_fees (booking_id);
create index idx_rental_fees_organization on rental_fees (organization_id);

-- ---- payment_providers (провайдеры платежей организации) --
create table payment_providers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  provider payment_provider_type not null,
  display_name text not null,
  is_enabled boolean not null default false,
  is_default boolean not null default false,
  mode payment_provider_mode not null default 'test',
  instructions text,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider)
);
create index idx_payment_providers_organization
  on payment_providers (organization_id);

-- ---- payment_accounts (публичные реквизиты провайдера) ----
--  Секреты сюда НЕ пишутся: только publishable key, id аккаунта,
--  адрес криптокошелька и прочие неконфиденциальные данные.
create table payment_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  payment_provider_id uuid not null
    references payment_providers(id) on delete cascade,
  label text not null,
  external_account_id text,
  publishable_key text,
  crypto_network text,
  crypto_wallet_address text,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_payment_accounts_organization
  on payment_accounts (organization_id);
create index idx_payment_accounts_provider
  on payment_accounts (payment_provider_id);

-- ---- rental_payments (платежи по бронированию) ------------
create table rental_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  booking_id uuid not null references rental_bookings(id) on delete cascade,
  payment_provider_id uuid
    references payment_providers(id) on delete set null,
  provider payment_provider_type not null,
  purpose payment_purpose not null default 'booking_total',
  status payment_status not null default 'pending',
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null,
  provider_reference text,
  is_manual boolean not null default false,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_rental_payments_booking on rental_payments (booking_id);
create index idx_rental_payments_organization
  on rental_payments (organization_id);
create index idx_rental_payments_reference
  on rental_payments (provider_reference);

-- ---- payment_transactions (операции у провайдера) ---------
create table payment_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  rental_payment_id uuid
    references rental_payments(id) on delete set null,
  booking_id uuid references rental_bookings(id) on delete set null,
  provider payment_provider_type not null,
  kind payment_transaction_kind not null default 'charge',
  status payment_status not null default 'pending',
  amount numeric(12, 2) not null,
  currency text not null,
  provider_transaction_id text,
  provider_payload jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_payment_transactions_payment
  on payment_transactions (rental_payment_id);
create index idx_payment_transactions_booking
  on payment_transactions (booking_id);
create index idx_payment_transactions_organization
  on payment_transactions (organization_id);

-- ---- payment_webhooks (журнал входящих вебхуков) ----------
create table payment_webhooks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete set null,
  provider payment_provider_type not null,
  event_type text,
  external_event_id text,
  payload jsonb not null default '{}'::jsonb,
  signature_verified boolean not null default false,
  processed boolean not null default false,
  processing_error text,
  received_at timestamptz not null default now()
);
-- Идемпотентность: один и тот же вебхук провайдера не обрабатывается дважды.
create unique index payment_webhooks_provider_event
  on payment_webhooks (provider, external_event_id)
  where external_event_id is not null;
create index idx_payment_webhooks_organization
  on payment_webhooks (organization_id);

-- ---- refunds (возвраты) -----------------------------------
create table refunds (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  booking_id uuid references rental_bookings(id) on delete set null,
  rental_payment_id uuid
    references rental_payments(id) on delete set null,
  payment_transaction_id uuid
    references payment_transactions(id) on delete set null,
  provider payment_provider_type not null,
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null,
  status refund_status not null default 'pending',
  reason text,
  provider_refund_id text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_refunds_booking on refunds (booking_id);
create index idx_refunds_payment on refunds (rental_payment_id);
create index idx_refunds_organization on refunds (organization_id);

-- ---- updated_at триггеры ----------------------------------
create trigger trg_rental_bookings_updated_at before update on rental_bookings
  for each row execute function set_updated_at();
create trigger trg_payment_providers_updated_at
  before update on payment_providers
  for each row execute function set_updated_at();
create trigger trg_payment_accounts_updated_at
  before update on payment_accounts
  for each row execute function set_updated_at();
create trigger trg_rental_payments_updated_at before update on rental_payments
  for each row execute function set_updated_at();
create trigger trg_payment_transactions_updated_at
  before update on payment_transactions
  for each row execute function set_updated_at();
create trigger trg_refunds_updated_at before update on refunds
  for each row execute function set_updated_at();
