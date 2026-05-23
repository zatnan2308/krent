-- ============================================================
--  Krent: RLS для модуля integrations.
--  Чтение в админке — по праву analytics.view. Запись идёт
--  сервис-клиентом из server actions и sync-задач после
--  проверки прав либо подписи провайдера.
-- ============================================================

alter table integration_connections enable row level security;
alter table google_search_console_connections enable row level security;
alter table google_ads_connections enable row level security;
alter table meta_ads_connections enable row level security;
alter table integration_tokens enable row level security;
alter table ad_campaign_reports enable row level security;
alter table seo_reports enable row level security;
alter table seo_opportunities enable row level security;

create policy "integration_connections_select"
  on integration_connections for select to authenticated
  using (app_private.has_permission(organization_id, 'analytics.view'));

create policy "gsc_connections_select"
  on google_search_console_connections for select to authenticated
  using (app_private.has_permission(organization_id, 'analytics.view'));

create policy "google_ads_connections_select"
  on google_ads_connections for select to authenticated
  using (app_private.has_permission(organization_id, 'analytics.view'));

create policy "meta_ads_connections_select"
  on meta_ads_connections for select to authenticated
  using (app_private.has_permission(organization_id, 'analytics.view'));

create policy "integration_tokens_select"
  on integration_tokens for select to authenticated
  using (app_private.has_permission(organization_id, 'analytics.view'));

create policy "ad_campaign_reports_select"
  on ad_campaign_reports for select to authenticated
  using (app_private.has_permission(organization_id, 'analytics.view'));

create policy "seo_reports_select"
  on seo_reports for select to authenticated
  using (app_private.has_permission(organization_id, 'analytics.view'));

create policy "seo_opportunities_select"
  on seo_opportunities for select to authenticated
  using (app_private.has_permission(organization_id, 'analytics.view'));
