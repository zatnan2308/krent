-- ============================================================
--  Krent: RLS для модуля календаря аренды.
--  Чтение — право properties.view, запись — properties.update.
--  iCal-экспорт и cron работают через сервис-клиент (минуя RLS):
--  экспорт защищён токеном фида, cron — секретом окружения.
-- ============================================================

alter table rental_calendars enable row level security;
alter table rental_calendar_events enable row level security;
alter table rental_availability_rules enable row level security;
alter table rental_price_rules enable row level security;
alter table ical_import_sources enable row level security;
alter table ical_sync_logs enable row level security;
alter table ical_export_tokens enable row level security;

create policy "rental_calendars_select"
  on rental_calendars for select to authenticated
  using (app_private.has_permission(organization_id, 'properties.view'));
create policy "rental_calendars_write"
  on rental_calendars for all to authenticated
  using (app_private.has_permission(organization_id, 'properties.update'))
  with check (app_private.has_permission(organization_id, 'properties.update'));

create policy "rental_calendar_events_select"
  on rental_calendar_events for select to authenticated
  using (app_private.has_permission(organization_id, 'properties.view'));
create policy "rental_calendar_events_write"
  on rental_calendar_events for all to authenticated
  using (app_private.has_permission(organization_id, 'properties.update'))
  with check (app_private.has_permission(organization_id, 'properties.update'));

create policy "rental_availability_rules_select"
  on rental_availability_rules for select to authenticated
  using (app_private.has_permission(organization_id, 'properties.view'));
create policy "rental_availability_rules_write"
  on rental_availability_rules for all to authenticated
  using (app_private.has_permission(organization_id, 'properties.update'))
  with check (app_private.has_permission(organization_id, 'properties.update'));

create policy "rental_price_rules_select"
  on rental_price_rules for select to authenticated
  using (app_private.has_permission(organization_id, 'properties.view'));
create policy "rental_price_rules_write"
  on rental_price_rules for all to authenticated
  using (app_private.has_permission(organization_id, 'properties.update'))
  with check (app_private.has_permission(organization_id, 'properties.update'));

create policy "ical_import_sources_select"
  on ical_import_sources for select to authenticated
  using (app_private.has_permission(organization_id, 'properties.view'));
create policy "ical_import_sources_write"
  on ical_import_sources for all to authenticated
  using (app_private.has_permission(organization_id, 'properties.update'))
  with check (app_private.has_permission(organization_id, 'properties.update'));

create policy "ical_sync_logs_select"
  on ical_sync_logs for select to authenticated
  using (app_private.has_permission(organization_id, 'properties.view'));

create policy "ical_export_tokens_select"
  on ical_export_tokens for select to authenticated
  using (app_private.has_permission(organization_id, 'properties.view'));
create policy "ical_export_tokens_write"
  on ical_export_tokens for all to authenticated
  using (app_private.has_permission(organization_id, 'properties.update'))
  with check (app_private.has_permission(organization_id, 'properties.update'));
