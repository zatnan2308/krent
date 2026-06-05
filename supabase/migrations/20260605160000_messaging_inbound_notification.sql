-- ============================================================
--  Krent: уведомление о новом входящем из канала мессенджера
--  (WhatsApp / Telegram / Messenger). Внутреннее уведомление
--  сотруднику — нетранзакционное (подчиняется notification_preferences).
--  Кормит колокол (notification_logs) и письмо ответственному агенту.
-- ============================================================

insert into public.notification_templates
  (key, name, description, audience, is_transactional)
values
  ('messaging.inbound', 'New channel message',
    'Notifies the responsible agent about a new WhatsApp, Telegram, or Messenger message.',
    'Agent', false)
on conflict (key) do nothing;

insert into public.email_templates
  (organization_id, key, name, subject, body_html)
select
  null, 'messaging.inbound', 'New channel message',
  'New {{channel_label}} message from {{contact_name}}',
  '<p>Hi {{first_name}},</p><p>You have a new {{channel_label}} message from {{contact_name}}. Sign in to read it and reply.</p>'
where not exists (
  select 1 from public.email_templates
  where organization_id is null and key = 'messaging.inbound'
);
