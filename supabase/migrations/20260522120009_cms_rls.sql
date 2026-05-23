-- ============================================================
--  Krent: RLS-политики публичного CMS
--  anon видит только опубликованный контент; навигация, SEO и
--  редиректы публичны (контент сайта); запись — по правам.
--  domains получает anon-политику для резолва организации по домену.
-- ============================================================

alter table pages enable row level security;
alter table page_translations enable row level security;
alter table navigation_menus enable row level security;
alter table navigation_items enable row level security;
alter table seo_settings enable row level security;
alter table redirects enable row level security;

-- ---- pages ------------------------------------------------
create policy "pages_select_anon"
  on pages for select to anon
  using (status = 'published');

create policy "pages_select_authenticated"
  on pages for select to authenticated
  using (
    status = 'published'
    or app_private.is_org_member(organization_id)
  );

create policy "pages_insert"
  on pages for insert to authenticated
  with check (app_private.has_permission(organization_id, 'pages.manage'));

create policy "pages_update"
  on pages for update to authenticated
  using (app_private.has_permission(organization_id, 'pages.manage'))
  with check (app_private.has_permission(organization_id, 'pages.manage'));

create policy "pages_delete"
  on pages for delete to authenticated
  using (app_private.has_permission(organization_id, 'pages.manage'));

-- ---- page_translations ------------------------------------
create policy "page_translations_select_anon"
  on page_translations for select to anon
  using (
    exists (
      select 1 from pages p
      where p.id = page_id and p.status = 'published'
    )
  );

create policy "page_translations_select_authenticated"
  on page_translations for select to authenticated
  using (
    app_private.is_org_member(organization_id)
    or exists (
      select 1 from pages p
      where p.id = page_id and p.status = 'published'
    )
  );

create policy "page_translations_insert"
  on page_translations for insert to authenticated
  with check (app_private.has_permission(organization_id, 'pages.manage'));

create policy "page_translations_update"
  on page_translations for update to authenticated
  using (app_private.has_permission(organization_id, 'pages.manage'))
  with check (app_private.has_permission(organization_id, 'pages.manage'));

create policy "page_translations_delete"
  on page_translations for delete to authenticated
  using (app_private.has_permission(organization_id, 'pages.manage'));

-- ---- navigation_menus -------------------------------------
create policy "navigation_menus_select"
  on navigation_menus for select to anon, authenticated
  using (true);

create policy "navigation_menus_insert"
  on navigation_menus for insert to authenticated
  with check (app_private.has_permission(organization_id, 'navigation.manage'));

create policy "navigation_menus_update"
  on navigation_menus for update to authenticated
  using (app_private.has_permission(organization_id, 'navigation.manage'))
  with check (app_private.has_permission(organization_id, 'navigation.manage'));

create policy "navigation_menus_delete"
  on navigation_menus for delete to authenticated
  using (app_private.has_permission(organization_id, 'navigation.manage'));

-- ---- navigation_items -------------------------------------
create policy "navigation_items_select"
  on navigation_items for select to anon, authenticated
  using (true);

create policy "navigation_items_insert"
  on navigation_items for insert to authenticated
  with check (app_private.has_permission(organization_id, 'navigation.manage'));

create policy "navigation_items_update"
  on navigation_items for update to authenticated
  using (app_private.has_permission(organization_id, 'navigation.manage'))
  with check (app_private.has_permission(organization_id, 'navigation.manage'));

create policy "navigation_items_delete"
  on navigation_items for delete to authenticated
  using (app_private.has_permission(organization_id, 'navigation.manage'));

-- ---- seo_settings -----------------------------------------
create policy "seo_settings_select"
  on seo_settings for select to anon, authenticated
  using (true);

create policy "seo_settings_insert"
  on seo_settings for insert to authenticated
  with check (app_private.has_permission(organization_id, 'seo.manage'));

create policy "seo_settings_update"
  on seo_settings for update to authenticated
  using (app_private.has_permission(organization_id, 'seo.manage'))
  with check (app_private.has_permission(organization_id, 'seo.manage'));

-- ---- redirects --------------------------------------------
create policy "redirects_select"
  on redirects for select to anon, authenticated
  using (true);

create policy "redirects_insert"
  on redirects for insert to authenticated
  with check (app_private.has_permission(organization_id, 'pages.manage'));

create policy "redirects_update"
  on redirects for update to authenticated
  using (app_private.has_permission(organization_id, 'pages.manage'))
  with check (app_private.has_permission(organization_id, 'pages.manage'));

create policy "redirects_delete"
  on redirects for delete to authenticated
  using (app_private.has_permission(organization_id, 'pages.manage'));

-- ---- domains: anon-резолв организации по домену -----------
create policy "domains_select_verified_anon"
  on domains for select to anon
  using (status = 'verified');

-- ---- права CMS --------------------------------------------
insert into permissions (key, description) values
  ('pages.view', 'Просмотр страниц сайта.'),
  ('pages.manage', 'Управление страницами и редиректами.'),
  ('navigation.manage', 'Управление навигационными меню.')
on conflict (key) do nothing;

insert into role_permissions (role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.key in (
  'pages.view', 'pages.manage', 'navigation.manage'
)
where r.organization_id is null
  and r.key in ('org_owner', 'org_admin')
on conflict do nothing;

insert into role_permissions (role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.key = 'pages.view'
where r.organization_id is null
  and r.key = 'agent'
on conflict do nothing;
