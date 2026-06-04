-- ============================================================
--  Krent: системный шаблон письма-приглашения в клиентский портал.
--  Транзакционное письмо: отправляется всегда (активация кабинета
--  покупателя/продавца/гостя по ссылке с токеном).
-- ============================================================

insert into notification_templates
  (key, name, description, audience, is_transactional)
values
  ('portal.invited', 'Portal invitation',
    'Invites a client to activate their portal account.',
    'Client', true);

insert into email_templates
  (organization_id, key, name, subject, body_html)
values
  (null, 'portal.invited', 'Portal invitation',
    'Activate your {{company_name}} account',
    '<p>Hi {{first_name}},</p><p>{{company_name}} has set up an account for you. Activate it to follow your bookings, payments and messages in one place.</p><p><a href="{{invite_url}}">Activate your account</a></p><p>If the button does not work, copy this link into your browser:<br/>{{invite_url}}</p>');
