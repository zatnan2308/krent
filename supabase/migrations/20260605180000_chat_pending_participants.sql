-- ============================================================
--  Krent: чат с ещё НЕ активировавшим портал клиентом.
--  Бронь авто-приглашает гостя как pending (без auth-пользователя),
--  поэтому раньше агентство не могло ему написать. Делаем user_id
--  необязательным и добавляем portal_account_id — участником может
--  быть pending-аккаунт. При активации портала user_id проставляется
--  (backfill в acceptPortalInvite). RLS не меняется: участник без
--  user_id никому не открывает доступ (политика матчит auth.uid()).
-- ============================================================

alter table public.chat_participants
  alter column user_id drop not null;

alter table public.chat_participants
  add column portal_account_id uuid
  references public.portal_accounts(id) on delete cascade;

alter table public.chat_participants
  add constraint chat_participants_identity_check
  check (user_id is not null or portal_account_id is not null);

-- Один pending-участник на диалог на аккаунт.
create unique index chat_participants_conversation_portal_key
  on public.chat_participants (conversation_id, portal_account_id)
  where portal_account_id is not null;

-- Для backfill при активации портала.
create index idx_chat_participants_portal_account
  on public.chat_participants (portal_account_id)
  where portal_account_id is not null;
