-- Ссылка на Messenger организации (для плавающей кнопки связи на сайте).
alter table public.brand_settings
  add column if not exists contact_messenger text;
