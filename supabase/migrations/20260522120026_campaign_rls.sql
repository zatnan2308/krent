-- ============================================================
--  Krent: RLS для модуля email-кампаний.
--
--  Чтение в админке — по праву marketing.manage. Системные
--  campaign-шаблоны (organization_id null) открыты на чтение.
--  Запись идёт сервис-клиентом в server actions и публичном
--  unsubscribe-эндпоинте — после проверки прав либо токена.
-- ============================================================

alter table contact_segments enable row level security;
alter table contact_segment_members enable row level security;
alter table contact_consents enable row level security;
alter table campaign_templates enable row level security;
alter table campaigns enable row level security;
alter table campaign_blocks enable row level security;
alter table campaign_recipients enable row level security;
alter table campaign_reports enable row level security;
alter table email_unsubscribes enable row level security;
alter table automation_flows enable row level security;
alter table automation_steps enable row level security;

create policy "contact_segments_select"
  on contact_segments for select to authenticated
  using (app_private.has_permission(organization_id, 'marketing.manage'));

create policy "contact_segment_members_select"
  on contact_segment_members for select to authenticated
  using (app_private.has_permission(organization_id, 'marketing.manage'));

create policy "contact_consents_select"
  on contact_consents for select to authenticated
  using (app_private.has_permission(organization_id, 'marketing.manage'));

create policy "campaign_templates_select"
  on campaign_templates for select to authenticated
  using (
    organization_id is null
    or app_private.has_permission(organization_id, 'marketing.manage')
  );

create policy "campaigns_select"
  on campaigns for select to authenticated
  using (app_private.has_permission(organization_id, 'marketing.manage'));

create policy "campaign_blocks_select"
  on campaign_blocks for select to authenticated
  using (app_private.has_permission(organization_id, 'marketing.manage'));

create policy "campaign_recipients_select"
  on campaign_recipients for select to authenticated
  using (app_private.has_permission(organization_id, 'marketing.manage'));

create policy "campaign_reports_select"
  on campaign_reports for select to authenticated
  using (app_private.has_permission(organization_id, 'marketing.manage'));

create policy "email_unsubscribes_select"
  on email_unsubscribes for select to authenticated
  using (app_private.has_permission(organization_id, 'marketing.manage'));

create policy "automation_flows_select"
  on automation_flows for select to authenticated
  using (app_private.has_permission(organization_id, 'marketing.manage'));

create policy "automation_steps_select"
  on automation_steps for select to authenticated
  using (app_private.has_permission(organization_id, 'marketing.manage'));
