-- ============================================================
--  Krent: системный шаблон письма-напоминания о задаче CRM.
--  Внутреннее уведомление назначенному агенту (не транзакционное —
--  подчиняется notification_preferences). Рассылается cron'ом по
--  задачам со статусом open и наступившим due_date.
-- ============================================================

insert into notification_templates
  (key, name, description, audience, is_transactional)
values
  ('task.reminder', 'Task reminder',
    'Reminds the assigned agent about a due or overdue task.',
    'Agent', false);

insert into email_templates
  (organization_id, key, name, subject, body_html)
values
  (null, 'task.reminder', 'Task reminder',
    'Task due: {{task_title}}',
    '<p>Hi {{first_name}},</p><p>Your task <strong>{{task_title}}</strong> is due on {{due_date}}.</p><p>Open your dashboard to follow up.</p>');
