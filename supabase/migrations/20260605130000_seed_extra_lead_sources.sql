-- Источники лидов, которые код реально пишет в leads.source, но которых не было
-- в системном справочнике lead_sources. Без них breakdown/фильтр показывал бы
-- сырой ключ (например «api_showing_request») вместо человекочитаемого имени.
insert into public.lead_sources (organization_id, key, name, sort_order) values
  (null, 'api_showing_request', 'API showing request', 11),
  (null, 'api_booking_request', 'API booking request', 12),
  (null, 'account_deletion', 'Account deletion request', 13),
  (null, 'unsubscribe_link', 'Unsubscribe', 14)
on conflict do nothing;
