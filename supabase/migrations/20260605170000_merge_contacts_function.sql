-- ============================================================
--  Krent: атомарное слияние контактов. TG/Messenger создают новый
--  контакт, если телефон не сматчился — эта функция переносит ВСЕ
--  ссылки со вторичного контакта на первичный одной транзакцией и
--  удаляет вторичный. Для таблиц с unique по contact_id сначала
--  убираются дубль-строки вторичного (иначе конфликт ключа).
--  Вызывается только сервис-ролью из server action (после проверки
--  прав и принадлежности организации).
-- ============================================================

create or replace function public.merge_contacts(
  p_primary uuid,
  p_secondary uuid,
  p_org uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_phone text;
begin
  if p_primary = p_secondary then
    raise exception 'Cannot merge a contact into itself.';
  end if;
  if not exists (
    select 1 from public.contacts
    where id = p_primary and organization_id = p_org
  ) or not exists (
    select 1 from public.contacts
    where id = p_secondary and organization_id = p_org
  ) then
    raise exception 'Both contacts must belong to the organization.';
  end if;

  select email, phone into v_email, v_phone
  from public.contacts where id = p_secondary;

  -- Таблицы с unique по contact_id: убираем конфликтующие строки вторичного,
  -- затем переносим остальное на первичный.
  delete from public.contact_consents s
   where s.contact_id = p_secondary
     and exists (
       select 1 from public.contact_consents pr
       where pr.contact_id = p_primary and pr.consent_type = s.consent_type
     );
  update public.contact_consents set contact_id = p_primary
   where contact_id = p_secondary;

  delete from public.contact_segment_members s
   where s.contact_id = p_secondary
     and exists (
       select 1 from public.contact_segment_members pr
       where pr.contact_id = p_primary and pr.segment_id = s.segment_id
     );
  update public.contact_segment_members set contact_id = p_primary
   where contact_id = p_secondary;

  delete from public.favorite_properties s
   where s.contact_id = p_secondary
     and exists (
       select 1 from public.favorite_properties pr
       where pr.contact_id = p_primary and pr.property_id = s.property_id
     );
  update public.favorite_properties set contact_id = p_primary
   where contact_id = p_secondary;

  delete from public.portal_accounts s
   where s.contact_id = p_secondary
     and exists (
       select 1 from public.portal_accounts pr
       where pr.contact_id = p_primary and pr.portal_type = s.portal_type
     );
  update public.portal_accounts set contact_id = p_primary
   where contact_id = p_secondary;

  -- Прочие ссылки на контакт — прямой перенос.
  update public.campaign_recipients set contact_id = p_primary
   where contact_id = p_secondary;
  update public.contact_channel_identities set contact_id = p_primary
   where contact_id = p_secondary;
  update public.deals set contact_id = p_primary
   where contact_id = p_secondary;
  update public.email_unsubscribes set contact_id = p_primary
   where contact_id = p_secondary;
  update public.leads set contact_id = p_primary
   where contact_id = p_secondary;
  update public.messaging_conversations set contact_id = p_primary
   where contact_id = p_secondary;
  update public.notes set contact_id = p_primary
   where contact_id = p_secondary;
  update public.saved_searches set contact_id = p_primary
   where contact_id = p_secondary;
  update public.tasks set contact_id = p_primary
   where contact_id = p_secondary;
  update public.properties set seller_contact_id = p_primary
   where seller_contact_id = p_secondary;
  update public.rental_bookings set guest_contact_id = p_primary
   where guest_contact_id = p_secondary;

  -- Удаляем вторичный (ссылок уже не осталось) и дозаполняем пустые поля.
  delete from public.contacts where id = p_secondary and organization_id = p_org;
  update public.contacts
     set email = coalesce(email, v_email),
         phone = coalesce(phone, v_phone)
   where id = p_primary;
end;
$$;

revoke all on function public.merge_contacts(uuid, uuid, uuid) from public;
grant execute on function public.merge_contacts(uuid, uuid, uuid) to service_role;
