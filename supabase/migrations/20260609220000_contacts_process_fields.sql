-- ============================================================
--  Krent CRM — блок G: процесс/служебное.
--  Дата последнего контакта и следующего касания, статус верификации,
--  VIP-флаг и внутренние заметки агента.
-- ============================================================

alter table public.contacts
  add column if not exists last_contacted_at timestamptz,
  add column if not exists next_follow_up_at timestamptz,
  add column if not exists verification_status text not null default 'none',
  add column if not exists is_vip boolean not null default false,
  add column if not exists internal_notes text;

create index if not exists idx_contacts_next_follow_up
  on public.contacts (organization_id, next_follow_up_at)
  where next_follow_up_at is not null;
