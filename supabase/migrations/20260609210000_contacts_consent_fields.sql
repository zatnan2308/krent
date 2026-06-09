-- ============================================================
--  Krent CRM — блок F: согласия на связь и коммуникации.
--  Согласия по каналам (звонок/SMS/email/WhatsApp), маркетинговое
--  согласие, общий отказ от связи (DNC), источник и дата согласия.
--  Юридически значимо: GDPR / TCPA / 152-ФЗ.
-- ============================================================

alter table public.contacts
  add column if not exists consent_call boolean not null default false,
  add column if not exists consent_sms boolean not null default false,
  add column if not exists consent_email boolean not null default false,
  add column if not exists consent_whatsapp boolean not null default false,
  add column if not exists consent_marketing boolean not null default false,
  add column if not exists do_not_contact boolean not null default false,
  add column if not exists consent_source text,
  add column if not exists consent_at timestamptz;
