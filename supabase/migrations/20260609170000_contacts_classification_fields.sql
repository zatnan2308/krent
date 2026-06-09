-- ============================================================
--  Krent CRM — блок B: классификация и квалификация клиента.
--  role (покупатель/продавец/арендатор/инвестор), стадия жизненного
--  цикла, температура, лид-скоринг, приоритет и свободные теги.
-- ============================================================

alter table public.contacts
  add column if not exists role text,
  add column if not exists lifecycle_stage text not null default 'new',
  add column if not exists temperature text,
  add column if not exists lead_score integer,
  add column if not exists priority text,
  add column if not exists tags text[] not null default '{}'::text[];

create index if not exists idx_contacts_lifecycle
  on public.contacts (organization_id, lifecycle_stage);
create index if not exists idx_contacts_tags
  on public.contacts using gin (tags);
