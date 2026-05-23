-- ============================================================
--  Krent: переработка licenses в installation-модель.
--  License описывает выданную копию платформы (клиент, домен,
--  тип установки, окно обновлений и поддержки), а не тариф.
-- ============================================================

create type license_installation_type as enum (
  'solo_realtor_installation',
  'agency_installation',
  'property_management_installation',
  'custom_installation'
);

alter table licenses
  add column installation_type license_installation_type
    not null default 'agency_installation',
  add column client_name text,
  add column client_email text,
  add column domain text,
  add column product_version text,
  add column updates_until timestamptz,
  add column notes text;

-- starts_at и support_expires_at переименовываем под новую модель.
alter table licenses rename column starts_at to issued_at;
alter table licenses rename column support_expires_at to support_until;

-- Распределяем installation_type по существующим строкам, опираясь
-- на наименование пакета, если оно есть.
update licenses
set installation_type = case
  when lower(package_name) like '%solo%' then 'solo_realtor_installation'
  when lower(package_name) like '%property%manag%' then 'property_management_installation'
  when lower(package_name) like '%agency%' then 'agency_installation'
  else 'custom_installation'
end::license_installation_type
where package_name is not null;

alter table licenses drop column package_name;
