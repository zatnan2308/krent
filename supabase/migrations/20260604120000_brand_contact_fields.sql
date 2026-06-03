-- Контактные данные, соцсети и тексты футера организации.
-- Редактируются из админки (Settings → Site & contact), отображаются на
-- публичном сайте: хедер, футер, страница /contact. Все поля опциональны.
alter table public.brand_settings
  add column if not exists contact_email text,
  add column if not exists contact_phone text,
  add column if not exists contact_whatsapp text,
  add column if not exists contact_address text,
  add column if not exists office_hours text,
  add column if not exists response_time text,
  add column if not exists footer_tagline text,
  add column if not exists newsletter_title text,
  add column if not exists newsletter_blurb text,
  add column if not exists social_instagram text,
  add column if not exists social_linkedin text,
  add column if not exists social_facebook text,
  add column if not exists social_x text,
  add column if not exists social_youtube text;
