-- ============================================================
--  Krent: RLS, Storage и права для модуля объектов недвижимости
--  Доступ к дочерним таблицам наследуется от объекта через
--  функции can_view_property / can_edit_property.
-- ============================================================

-- ---- Функции доступа к объекту ----------------------------
-- Видимость: публичный активный объект, либо назначенный/со-агент,
-- либо право properties.manage_all.
create function app_private.can_view_property(p_property_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.properties p
    where p.id = p_property_id
      and (
        (p.status = 'active' and p.visibility = 'public')
        or p.assigned_agent_id = auth.uid()
        or auth.uid() = any (p.co_agent_ids)
        or app_private.has_permission(p.organization_id, 'properties.manage_all')
      )
  );
$$;

-- Право редактирования: назначенный/со-агент либо properties.manage_all.
create function app_private.can_edit_property(p_property_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.properties p
    where p.id = p_property_id
      and (
        p.assigned_agent_id = auth.uid()
        or auth.uid() = any (p.co_agent_ids)
        or app_private.has_permission(p.organization_id, 'properties.manage_all')
      )
  );
$$;

-- ---- Включение RLS ----------------------------------------
alter table amenity_categories enable row level security;
alter table amenities enable row level security;
alter table properties enable row level security;
alter table property_translations enable row level security;
alter table property_prices enable row level security;
alter table property_media enable row level security;
alter table property_videos enable row level security;
alter table property_documents enable row level security;
alter table property_amenities enable row level security;
alter table property_locations enable row level security;
alter table nearby_places enable row level security;

-- ---- amenity_categories / amenities (справочники) ---------
create policy "amenity_categories_select"
  on amenity_categories for select to anon, authenticated
  using (true);
create policy "amenity_categories_write"
  on amenity_categories for all to authenticated
  using (
    organization_id is not null
    and app_private.has_permission(organization_id, 'properties.manage_all')
  )
  with check (
    organization_id is not null
    and app_private.has_permission(organization_id, 'properties.manage_all')
  );

create policy "amenities_select"
  on amenities for select to anon, authenticated
  using (true);
create policy "amenities_write"
  on amenities for all to authenticated
  using (
    organization_id is not null
    and app_private.has_permission(organization_id, 'properties.manage_all')
  )
  with check (
    organization_id is not null
    and app_private.has_permission(organization_id, 'properties.manage_all')
  );

-- ---- properties -------------------------------------------
create policy "properties_select_anon"
  on properties for select to anon
  using (status = 'active' and visibility = 'public');

create policy "properties_select_authenticated"
  on properties for select to authenticated
  using (
    (status = 'active' and visibility = 'public')
    or assigned_agent_id = auth.uid()
    or auth.uid() = any (co_agent_ids)
    or app_private.has_permission(organization_id, 'properties.manage_all')
  );

create policy "properties_insert"
  on properties for insert to authenticated
  with check (app_private.has_permission(organization_id, 'properties.create'));

create policy "properties_update"
  on properties for update to authenticated
  using (
    app_private.has_permission(organization_id, 'properties.update')
    and (
      assigned_agent_id = auth.uid()
      or auth.uid() = any (co_agent_ids)
      or app_private.has_permission(organization_id, 'properties.manage_all')
    )
  )
  with check (
    app_private.has_permission(organization_id, 'properties.update')
    and (
      assigned_agent_id = auth.uid()
      or auth.uid() = any (co_agent_ids)
      or app_private.has_permission(organization_id, 'properties.manage_all')
    )
  );

create policy "properties_delete"
  on properties for delete to authenticated
  using (
    app_private.has_permission(organization_id, 'properties.delete')
    and (
      assigned_agent_id = auth.uid()
      or auth.uid() = any (co_agent_ids)
      or app_private.has_permission(organization_id, 'properties.manage_all')
    )
  );

-- ---- Дочерние таблицы объекта -----------------------------
create policy "property_translations_select"
  on property_translations for select to anon, authenticated
  using (app_private.can_view_property(property_id));
create policy "property_translations_write"
  on property_translations for all to authenticated
  using (app_private.can_edit_property(property_id))
  with check (app_private.can_edit_property(property_id));

create policy "property_prices_select"
  on property_prices for select to anon, authenticated
  using (app_private.can_view_property(property_id));
create policy "property_prices_write"
  on property_prices for all to authenticated
  using (app_private.can_edit_property(property_id))
  with check (app_private.can_edit_property(property_id));

create policy "property_media_select"
  on property_media for select to anon, authenticated
  using (app_private.can_view_property(property_id));
create policy "property_media_write"
  on property_media for all to authenticated
  using (app_private.can_edit_property(property_id))
  with check (app_private.can_edit_property(property_id));

create policy "property_videos_select"
  on property_videos for select to anon, authenticated
  using (app_private.can_view_property(property_id));
create policy "property_videos_write"
  on property_videos for all to authenticated
  using (app_private.can_edit_property(property_id))
  with check (app_private.can_edit_property(property_id));

create policy "property_documents_select"
  on property_documents for select to anon, authenticated
  using (app_private.can_view_property(property_id));
create policy "property_documents_write"
  on property_documents for all to authenticated
  using (app_private.can_edit_property(property_id))
  with check (app_private.can_edit_property(property_id));

create policy "property_amenities_select"
  on property_amenities for select to anon, authenticated
  using (app_private.can_view_property(property_id));
create policy "property_amenities_write"
  on property_amenities for all to authenticated
  using (app_private.can_edit_property(property_id))
  with check (app_private.can_edit_property(property_id));

create policy "property_locations_select"
  on property_locations for select to anon, authenticated
  using (app_private.can_view_property(property_id));
create policy "property_locations_write"
  on property_locations for all to authenticated
  using (app_private.can_edit_property(property_id))
  with check (app_private.can_edit_property(property_id));

create policy "nearby_places_select"
  on nearby_places for select to anon, authenticated
  using (app_private.can_view_property(property_id));
create policy "nearby_places_write"
  on nearby_places for all to authenticated
  using (app_private.can_edit_property(property_id))
  with check (app_private.can_edit_property(property_id));

-- ---- Storage: bucket для медиа объектов -------------------
insert into storage.buckets (id, name, public)
values ('property-media', 'property-media', true)
on conflict (id) do nothing;

create policy "property_media_storage_read"
  on storage.objects for select
  using (bucket_id = 'property-media');

-- ---- Право доступа ко всем объектам организации -----------
insert into permissions (key, description) values
  ('properties.manage_all', 'Доступ ко всем объектам организации.')
on conflict (key) do nothing;

insert into role_permissions (role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.key = 'properties.manage_all'
where r.organization_id is null
  and r.key in ('org_owner', 'org_admin')
on conflict do nothing;

-- ---- Seed системных категорий и удобств -------------------
insert into amenity_categories (organization_id, key, name, sort_order) values
  (null, 'general', 'General', 1),
  (null, 'indoor', 'Indoor', 2),
  (null, 'outdoor', 'Outdoor', 3),
  (null, 'building', 'Building', 4)
on conflict do nothing;

insert into amenities (organization_id, category_id, key, name, sort_order)
select
  null,
  c.id,
  source.key,
  source.name,
  source.sort_order
from (
  values
    ('wifi', 'Wi-Fi', 'general', 1),
    ('pets_allowed', 'Pets allowed', 'general', 2),
    ('air_conditioning', 'Air conditioning', 'indoor', 1),
    ('heating', 'Heating', 'indoor', 2),
    ('furnished', 'Furnished', 'indoor', 3),
    ('balcony', 'Balcony', 'outdoor', 1),
    ('garden', 'Garden', 'outdoor', 2),
    ('pool', 'Swimming pool', 'outdoor', 3),
    ('parking', 'Parking', 'building', 1),
    ('elevator', 'Elevator', 'building', 2),
    ('gym', 'Gym', 'building', 3),
    ('security', 'Security', 'building', 4)
) as source(key, name, category_key, sort_order)
join amenity_categories c
  on c.key = source.category_key and c.organization_id is null
on conflict do nothing;
