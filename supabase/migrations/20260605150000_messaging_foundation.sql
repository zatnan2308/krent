-- Multi-channel messaging foundation (WhatsApp Cloud / Telegram / Messenger).
-- Отдельная от чата (chat_participants.user_id NOT NULL): контакты каналов —
-- не auth-юзеры, поэтому переписка привязана к contact_id + channel.

create type public.messaging_channel as enum (
  'whatsapp_cloud', 'telegram', 'messenger'
);
create type public.messaging_connection_status as enum (
  'pending', 'connected', 'disconnected', 'error'
);
create type public.messaging_direction as enum ('inbound', 'outbound');
create type public.messaging_message_status as enum (
  'received', 'queued', 'sent', 'delivered', 'read', 'failed'
);

-- ---- Подключения каналов (на тенант) ----------------------
create table public.messaging_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  channel public.messaging_channel not null,
  display_name text,
  status public.messaging_connection_status not null default 'connected',
  encrypted_token text,
  waba_id text,
  phone_number_id text,
  phone_display text,
  bot_username text,
  webhook_token text,
  page_id text,
  page_name text,
  error_message text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_messaging_connections_org
  on public.messaging_connections (organization_id);
create unique index messaging_connections_wa_number
  on public.messaging_connections (phone_number_id)
  where channel = 'whatsapp_cloud' and phone_number_id is not null;
create unique index messaging_connections_page
  on public.messaging_connections (page_id)
  where channel = 'messenger' and page_id is not null;
create unique index messaging_connections_webhook_token
  on public.messaging_connections (webhook_token)
  where webhook_token is not null;

-- ---- Идентичности контакта по каналам ---------------------
create table public.contact_channel_identities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  channel public.messaging_channel not null,
  external_id text not null,
  handle text,
  created_at timestamptz not null default now(),
  unique (organization_id, channel, external_id)
);
create index idx_contact_channel_identities_contact
  on public.contact_channel_identities (contact_id);

-- ---- Диалоги (один тред на идентичность канала) -----------
create table public.messaging_conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  channel public.messaging_channel not null,
  connection_id uuid references public.messaging_connections(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  channel_identity_id uuid references public.contact_channel_identities(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  assigned_agent_id uuid references auth.users(id) on delete set null,
  last_message_at timestamptz,
  last_inbound_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index messaging_conversations_identity
  on public.messaging_conversations (organization_id, channel, channel_identity_id)
  where channel_identity_id is not null;
create index idx_messaging_conversations_org_last
  on public.messaging_conversations (organization_id, last_message_at desc);

-- ---- Сообщения --------------------------------------------
create table public.messaging_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid not null references public.messaging_conversations(id) on delete cascade,
  channel public.messaging_channel not null,
  direction public.messaging_direction not null,
  status public.messaging_message_status not null default 'received',
  external_message_id text,
  sender_user_id uuid references auth.users(id) on delete set null,
  body text not null default '',
  error_message text,
  created_at timestamptz not null default now()
);
create unique index messaging_messages_external
  on public.messaging_messages (channel, external_message_id)
  where external_message_id is not null;
create index idx_messaging_messages_conversation
  on public.messaging_messages (conversation_id, created_at);

-- ---- Вложения (переиспользуем enum attachment_type) -------
create table public.messaging_attachments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  message_id uuid not null references public.messaging_messages(id) on delete cascade,
  conversation_id uuid not null references public.messaging_conversations(id) on delete cascade,
  file_name text not null,
  file_size bigint not null default 0,
  file_type public.attachment_type not null,
  file_url text not null,
  mime_type text not null,
  external_media_id text,
  created_at timestamptz not null default now()
);
create index idx_messaging_attachments_message
  on public.messaging_attachments (message_id);

-- ---- Отметка прочтения (для бейджа непрочитанного) --------
create table public.messaging_read_state (
  conversation_id uuid not null references public.messaging_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

-- ---- updated_at триггеры ----------------------------------
create trigger trg_messaging_connections_updated_at
  before update on public.messaging_connections
  for each row execute function public.set_updated_at();
create trigger trg_messaging_conversations_updated_at
  before update on public.messaging_conversations
  for each row execute function public.set_updated_at();

-- ---- RLS: чтение по crm.view; запись — сервис-клиентом -----
alter table public.messaging_connections enable row level security;
alter table public.contact_channel_identities enable row level security;
alter table public.messaging_conversations enable row level security;
alter table public.messaging_messages enable row level security;
alter table public.messaging_attachments enable row level security;
alter table public.messaging_read_state enable row level security;

create policy "messaging_connections_select" on public.messaging_connections
  for select to authenticated
  using (app_private.has_permission(organization_id, 'crm.view'));
create policy "contact_channel_identities_select" on public.contact_channel_identities
  for select to authenticated
  using (app_private.has_permission(organization_id, 'crm.view'));
create policy "messaging_conversations_select" on public.messaging_conversations
  for select to authenticated
  using (app_private.has_permission(organization_id, 'crm.view'));
create policy "messaging_messages_select" on public.messaging_messages
  for select to authenticated
  using (app_private.has_permission(organization_id, 'crm.view'));
create policy "messaging_attachments_select" on public.messaging_attachments
  for select to authenticated
  using (app_private.has_permission(organization_id, 'crm.view'));
create policy "messaging_read_state_select" on public.messaging_read_state
  for select to authenticated using (user_id = (select auth.uid()));
create policy "messaging_read_state_write" on public.messaging_read_state
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---- Приватный бакет для медиа каналов --------------------
insert into storage.buckets (id, name, public)
values ('messaging-media', 'messaging-media', false)
on conflict (id) do nothing;
