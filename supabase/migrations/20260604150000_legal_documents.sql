-- Редактируемые юридические страницы (privacy/terms/cookies): заголовок + тело.
-- Тело в формате markdown-lite: "## Подзаголовок", "- пункт списка", абзацы.
create table if not exists public.legal_documents (
  organization_id uuid not null
    references public.organizations(id) on delete cascade,
  doc_key text not null,
  title text,
  body text,
  updated_at timestamptz not null default now(),
  primary key (organization_id, doc_key)
);

alter table public.legal_documents enable row level security;

create policy "legal_documents_member_all" on public.legal_documents
  for all using (app_private.is_org_member(organization_id))
  with check (app_private.is_org_member(organization_id));
create policy "legal_documents_public_read" on public.legal_documents
  for select using (true);
