-- ============================================================
--  Krent: RLS для модуля Agency API & Agent Website Sync.
--  Чтение в админке — по праву analytics.view. Запись идёт
--  сервис-клиентом из server actions и публичных API после
--  валидации ключа/прав. api_scopes — публичный системный
--  каталог.
-- ============================================================

alter table agent_website_connections enable row level security;
alter table api_keys enable row level security;
alter table api_scopes enable row level security;
alter table api_usage_logs enable row level security;
alter table api_rate_limits enable row level security;
alter table external_domains enable row level security;
alter table webhook_endpoints enable row level security;
alter table webhook_events enable row level security;
alter table webhook_delivery_logs enable row level security;
alter table property_sync_settings enable row level security;
alter table property_external_visibility enable row level security;
alter table agent_feed_settings enable row level security;

create policy "agent_website_connections_select"
  on agent_website_connections for select to authenticated
  using (app_private.has_permission(organization_id, 'analytics.view'));

create policy "api_keys_select"
  on api_keys for select to authenticated
  using (app_private.has_permission(organization_id, 'analytics.view'));

-- api_scopes — системный каталог, доступен всем для отображения
-- в админке выбора прав при создании ключа.
create policy "api_scopes_select"
  on api_scopes for select to authenticated using (true);

create policy "api_usage_logs_select"
  on api_usage_logs for select to authenticated
  using (app_private.has_permission(organization_id, 'analytics.view'));

create policy "api_rate_limits_select"
  on api_rate_limits for select to authenticated
  using (app_private.has_permission(organization_id, 'analytics.view'));

create policy "external_domains_select"
  on external_domains for select to authenticated
  using (app_private.has_permission(organization_id, 'analytics.view'));

create policy "webhook_endpoints_select"
  on webhook_endpoints for select to authenticated
  using (app_private.has_permission(organization_id, 'analytics.view'));

create policy "webhook_events_select"
  on webhook_events for select to authenticated
  using (app_private.has_permission(organization_id, 'analytics.view'));

create policy "webhook_delivery_logs_select"
  on webhook_delivery_logs for select to authenticated
  using (app_private.has_permission(organization_id, 'analytics.view'));

create policy "property_sync_settings_select"
  on property_sync_settings for select to authenticated
  using (app_private.has_permission(organization_id, 'analytics.view'));

create policy "property_external_visibility_select"
  on property_external_visibility for select to authenticated
  using (app_private.has_permission(organization_id, 'analytics.view'));

create policy "agent_feed_settings_select"
  on agent_feed_settings for select to authenticated
  using (app_private.has_permission(organization_id, 'analytics.view'));
