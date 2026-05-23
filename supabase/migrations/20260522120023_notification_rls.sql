-- ============================================================
--  Krent: RLS для Notification Center.
--
--  Чтение в админке — по праву email.manage. Каталог событий
--  (notification_templates) открыт на чтение всем аутентифициро-
--  ванным как несекретный системный справочник. Запись идёт
--  сервис-клиентом в dispatcher, server actions и webhook —
--  после проверки прав / подписи провайдера.
-- ============================================================

alter table notification_templates enable row level security;
alter table email_templates enable row level security;
alter table notification_preferences enable row level security;
alter table notification_events enable row level security;
alter table notification_logs enable row level security;
alter table email_sends enable row level security;
alter table email_bounces enable row level security;
alter table email_complaints enable row level security;

create policy "notification_templates_select"
  on notification_templates for select to authenticated
  using (true);

create policy "email_templates_select"
  on email_templates for select to authenticated
  using (
    organization_id is null
    or app_private.has_permission(organization_id, 'email.manage')
  );

create policy "notification_preferences_select"
  on notification_preferences for select to authenticated
  using (app_private.has_permission(organization_id, 'email.manage'));

create policy "notification_events_select"
  on notification_events for select to authenticated
  using (app_private.has_permission(organization_id, 'email.manage'));

create policy "notification_logs_select"
  on notification_logs for select to authenticated
  using (app_private.has_permission(organization_id, 'email.manage'));

create policy "email_sends_select"
  on email_sends for select to authenticated
  using (app_private.has_permission(organization_id, 'email.manage'));

create policy "email_bounces_select"
  on email_bounces for select to authenticated
  using (
    organization_id is not null
    and app_private.has_permission(organization_id, 'email.manage')
  );

create policy "email_complaints_select"
  on email_complaints for select to authenticated
  using (
    organization_id is not null
    and app_private.has_permission(organization_id, 'email.manage')
  );
