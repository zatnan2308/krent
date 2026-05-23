-- ============================================================
--  Krent: RLS, Realtime и Storage для модуля чата.
--  Доступ к диалогу — только участникам (chat_participants).
--  Записи (диалоги, сообщения, вложения) создаются доверенным
--  серверным кодом через сервис-клиент; RLS защищает чтение и
--  Realtime-подписку.
-- ============================================================

-- Участник диалога. SECURITY DEFINER — обходит RLS chat_participants,
-- чтобы политики не рекурсировали по той же таблице.
create function app_private.is_conversation_participant(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.chat_participants cp
    where cp.conversation_id = p_conversation_id
      and cp.user_id = auth.uid()
  );
$$;

-- ---- Включение RLS ----------------------------------------
alter table chat_conversations enable row level security;
alter table chat_participants enable row level security;
alter table chat_messages enable row level security;
alter table chat_attachments enable row level security;
alter table message_reads enable row level security;

-- ---- Чтение — только участникам диалога -------------------
create policy "chat_conversations_select"
  on chat_conversations for select to authenticated
  using (app_private.is_conversation_participant(id));

create policy "chat_participants_select"
  on chat_participants for select to authenticated
  using (app_private.is_conversation_participant(conversation_id));

create policy "chat_messages_select"
  on chat_messages for select to authenticated
  using (app_private.is_conversation_participant(conversation_id));

create policy "chat_attachments_select"
  on chat_attachments for select to authenticated
  using (app_private.is_conversation_participant(conversation_id));

-- ---- message_reads: пользователь ведёт свою отметку -------
create policy "message_reads_select"
  on message_reads for select to authenticated
  using (user_id = auth.uid());
create policy "message_reads_insert"
  on message_reads for insert to authenticated
  with check (
    user_id = auth.uid()
    and app_private.is_conversation_participant(conversation_id)
  );
create policy "message_reads_update"
  on message_reads for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---- Realtime для новых сообщений --------------------------
alter publication supabase_realtime add table chat_messages;

-- ---- Приватный bucket для вложений ------------------------
insert into storage.buckets (id, name, public)
values ('chat-attachments', 'chat-attachments', false)
on conflict (id) do nothing;
