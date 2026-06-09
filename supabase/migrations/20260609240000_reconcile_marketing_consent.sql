-- ============================================================
--  Krent — унификация маркетинг-согласия.
--  contacts.consent_marketing — единый источник правды (его читают
--  рассылки и список маркетинг-контактов); contact_consents остаётся
--  аудит-логом (granted_at/withdrawn_at/source) и пишется синхронно.
--  Реконсиляция: исторические «withdrawn» из аудита → колонка false.
-- ============================================================

update public.contacts c
set consent_marketing = false
from public.contact_consents cc
where cc.contact_id = c.id
  and cc.consent_type = 'marketing'
  and cc.status = 'withdrawn'
  and c.consent_marketing = true;
