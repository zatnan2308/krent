-- ============================================================
--  Krent: системные шаблоны уведомлений и транзакционных писем.
--  Письма-подтверждения для клиентов помечены как транзакционные
--  (отправляются всегда). Внутренние уведомления сотрудникам
--  (новый лид, новое сообщение) подчиняются notification_preferences.
-- ============================================================

-- ---- Каталог событий --------------------------------------
insert into notification_templates
  (key, name, description, audience, is_transactional)
values
  ('welcome', 'Welcome',
    'Sent to a new user when their account is ready.',
    'New user', true),
  ('lead.created', 'New lead notification',
    'Notifies the assigned agent about a new lead.',
    'Agent', false),
  ('contact.confirmation', 'Contact form confirmation',
    'Confirms a website contact enquiry to the sender.',
    'Contact', true),
  ('showing.confirmation', 'Showing request confirmation',
    'Confirms a viewing request to the sender.',
    'Contact', true),
  ('valuation.confirmation', 'Seller valuation confirmation',
    'Confirms a valuation request to the seller.',
    'Contact', true),
  ('booking.requested', 'Booking request received',
    'Confirms a booking request to the guest.',
    'Guest', true),
  ('booking.confirmed', 'Booking confirmed',
    'Notifies the guest that the booking is confirmed.',
    'Guest', true),
  ('payment.received', 'Payment received',
    'Confirms a received payment to the guest.',
    'Guest', true),
  ('chat.message', 'New chat message',
    'Notifies a conversation participant about a new message.',
    'Conversation participant', false),
  ('document.uploaded', 'Document uploaded',
    'Notifies a client that a document was shared.',
    'Client', true),
  ('checkin.instructions', 'Check-in instructions',
    'Placeholder for check-in instructions before arrival.',
    'Guest', true),
  ('checkout.reminder', 'Check-out reminder',
    'Placeholder reminder before check-out.',
    'Guest', true);

-- ---- Системные email-шаблоны ------------------------------
insert into email_templates
  (organization_id, key, name, subject, body_html)
values
  (null, 'welcome', 'Welcome',
    'Welcome to {{company_name}}',
    '<p>Hi {{first_name}},</p><p>Welcome to {{company_name}}. Your account is ready and we are glad to have you on board.</p>'),
  (null, 'lead.created', 'New lead notification',
    'New lead - {{property_title}}',
    '<p>Hi {{agent_name}},</p><p>A new lead has come in for {{property_title}}. Open your dashboard to review the details and follow up.</p>'),
  (null, 'contact.confirmation', 'Contact form confirmation',
    'We received your message',
    '<p>Hi {{first_name}},</p><p>Thank you for contacting {{company_name}}. We have received your message and an agent will be in touch shortly.</p>'),
  (null, 'showing.confirmation', 'Showing request confirmation',
    'Your viewing request - {{property_title}}',
    '<p>Hi {{first_name}},</p><p>We have received your request to view {{property_title}}. Our team will confirm the viewing details with you soon.</p>'),
  (null, 'valuation.confirmation', 'Seller valuation confirmation',
    'Your valuation request',
    '<p>Hi {{first_name}},</p><p>Thank you for requesting a property valuation from {{company_name}}. An agent will contact you to arrange the next steps.</p>'),
  (null, 'booking.requested', 'Booking request received',
    'Booking request received - {{property_title}}',
    '<p>Hi {{first_name}},</p><p>We have received your booking request for {{property_title}}.</p><p>Check-in: {{booking_checkin}}<br/>Check-out: {{booking_checkout}}</p><p>We will confirm your booking shortly.</p>'),
  (null, 'booking.confirmed', 'Booking confirmed',
    'Your booking is confirmed - {{property_title}}',
    '<p>Hi {{first_name}},</p><p>Your booking for {{property_title}} is confirmed.</p><p>Check-in: {{booking_checkin}}<br/>Check-out: {{booking_checkout}}</p><p>We look forward to hosting you.</p>'),
  (null, 'payment.received', 'Payment received',
    'Payment received - {{property_title}}',
    '<p>Hi {{first_name}},</p><p>We have received your payment for {{property_title}} and your booking is now confirmed.</p><p>Check-in: {{booking_checkin}}<br/>Check-out: {{booking_checkout}}</p>'),
  (null, 'chat.message', 'New chat message',
    'New message from {{agent_name}}',
    '<p>Hi {{first_name}},</p><p>You have a new message from {{agent_name}}. Sign in to read it and reply.</p>'),
  (null, 'document.uploaded', 'Document uploaded',
    'A document was shared with you',
    '<p>Hi {{first_name}},</p><p>{{agent_name}} has shared a new document with you. Sign in to view it.</p>'),
  (null, 'checkin.instructions', 'Check-in instructions',
    'Check-in instructions - {{property_title}}',
    '<p>Hi {{first_name}},</p><p>Your stay at {{property_title}} begins on {{booking_checkin}}.</p><p>Detailed check-in instructions will follow closer to your arrival.</p>'),
  (null, 'checkout.reminder', 'Check-out reminder',
    'Check-out reminder - {{property_title}}',
    '<p>Hi {{first_name}},</p><p>This is a friendly reminder that check-out for {{property_title}} is on {{booking_checkout}}.</p><p>Thank you for staying with {{company_name}}.</p>');
