-- ============================================================
--  Krent: RLS для модуля аналитики.
--
--  Чтение в админке — по праву analytics.view. Запись событий и
--  сессий идёт сервис-клиентом из публичного API tracking; чтение
--  tracking_settings для публичного tracker — тоже сервис-клиентом.
-- ============================================================

alter table analytics_sessions enable row level security;
alter table utm_sessions enable row level security;
alter table analytics_events enable row level security;
alter table tracking_settings enable row level security;

create policy "analytics_sessions_select"
  on analytics_sessions for select to authenticated
  using (app_private.has_permission(organization_id, 'analytics.view'));

create policy "utm_sessions_select"
  on utm_sessions for select to authenticated
  using (app_private.has_permission(organization_id, 'analytics.view'));

create policy "analytics_events_select"
  on analytics_events for select to authenticated
  using (app_private.has_permission(organization_id, 'analytics.view'));

create policy "tracking_settings_select"
  on tracking_settings for select to authenticated
  using (app_private.has_permission(organization_id, 'analytics.view'));
