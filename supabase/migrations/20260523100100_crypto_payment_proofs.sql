-- ============================================================
--  Krent: подтверждения crypto-платежей.
--  Гость загружает proof (tx_hash, network, скриншот), админ
--  утверждает или отклоняет; при approve платёж получает статус
--  succeeded и бронирование подтверждается.
-- ============================================================

create type crypto_proof_status as enum ('pending', 'approved', 'rejected');

create table crypto_payment_proofs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  rental_payment_id uuid not null references rental_payments(id) on delete cascade,
  tx_hash text,
  network text,
  amount numeric,
  currency text,
  proof_url text,
  notes text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  status crypto_proof_status not null default 'pending',
  reviewer_notes text
);
create index idx_crypto_payment_proofs_payment
  on crypto_payment_proofs (rental_payment_id, submitted_at desc);
create index idx_crypto_payment_proofs_org
  on crypto_payment_proofs (organization_id, status, submitted_at desc);

alter table crypto_payment_proofs enable row level security;
create policy "crypto_payment_proofs_select"
  on crypto_payment_proofs for select to authenticated
  using (app_private.has_permission(organization_id, 'payments.view'));
