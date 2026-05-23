-- ============================================================
--  Krent: чат клиента с риэлтором / менеджером. 5 таблиц —
--  диалоги, участники, сообщения, вложения, отметки прочтения.
--  Диалог привязан к объекту / лиду / бронированию / отчёту.
-- ============================================================

create type conversation_type as enum (
  'buyer_agent',
  'seller_agent',
  'guest_manager',
  'internal'
);
create type message_type as enum ('text', 'file', 'system');
create type attachment_type as enum ('image', 'video', 'document');

-- ---- chat_conversations -----------------------------------
-- booking_id и seller_report_id — без FK: таблицы появятся позже.
create table chat_conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  property_id uuid references properties(id) on delete set null,
  lead_id uuid references leads(id) on delete set null,
  booking_id uuid,
  seller_report_id uuid,
  type conversation_type not null,
  title text,
  created_by uuid references auth.users(id) on delete set null,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_chat_conversations_organization
  on chat_conversations (organization_id);
create index idx_chat_conversations_last_message
  on chat_conversations (last_message_at desc nulls last);

-- ---- chat_participants ------------------------------------
create table chat_participants (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null
    references chat_conversations(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (conversation_id, user_id)
);
create index idx_chat_participants_conversation
  on chat_participants (conversation_id);
create index idx_chat_participants_user on chat_participants (user_id);

-- ---- chat_messages ----------------------------------------
create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null
    references chat_conversations(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  message text not null default '',
  message_type message_type not null default 'text',
  created_at timestamptz not null default now()
);
create index idx_chat_messages_conversation
  on chat_messages (conversation_id, created_at);
create index idx_chat_messages_organization
  on chat_messages (organization_id);

-- ---- chat_attachments -------------------------------------
-- file_url хранит путь в приватном bucket; доступ — через signed URL.
create table chat_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references chat_messages(id) on delete cascade,
  conversation_id uuid not null
    references chat_conversations(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  file_url text not null,
  file_name text not null,
  file_type attachment_type not null,
  file_size bigint not null,
  mime_type text not null,
  created_at timestamptz not null default now()
);
create index idx_chat_attachments_message
  on chat_attachments (message_id);
create index idx_chat_attachments_conversation
  on chat_attachments (conversation_id);

-- ---- message_reads (отметка прочтения по диалогу) ---------
create table message_reads (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null
    references chat_conversations(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (conversation_id, user_id)
);
create index idx_message_reads_conversation
  on message_reads (conversation_id);
create index idx_message_reads_user on message_reads (user_id);

-- ---- updated_at триггеры ----------------------------------
create trigger trg_chat_conversations_updated_at
  before update on chat_conversations
  for each row execute function set_updated_at();
create trigger trg_message_reads_updated_at
  before update on message_reads
  for each row execute function set_updated_at();
