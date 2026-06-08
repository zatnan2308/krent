-- ============================================================
--  Krent: документы клиентов (порталы buyer/seller/guest).
--  Агент загружает файлы в CRM-карточке контакта; клиент скачивает
--  их в портале через серверный signed URL. Прямого клиентского
--  доступа к Storage нет — всё через серверные экшены (admin-клиент)
--  с проверкой прав агента / владельца-портала.
-- ============================================================

create table if not exists public.client_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  property_id uuid references public.properties(id) on delete set null,
  uploaded_by uuid references auth.users(id) on delete set null,
  file_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  portal_visible boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_client_documents_contact
  on public.client_documents (contact_id);
create index if not exists idx_client_documents_org
  on public.client_documents (organization_id);

alter table public.client_documents enable row level security;

-- Защита-в-глубину: записи доступны под RLS только обладателям crm.manage.
drop policy if exists "client_documents_manage" on public.client_documents;
create policy "client_documents_manage"
  on public.client_documents for all to authenticated
  using (app_private.has_permission(organization_id, 'crm.manage'))
  with check (app_private.has_permission(organization_id, 'crm.manage'));

-- Приватный бакет для документов клиентов.
insert into storage.buckets (id, name, public)
values ('client-documents', 'client-documents', false)
on conflict (id) do nothing;
