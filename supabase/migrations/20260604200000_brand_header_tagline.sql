-- ============================================================
--  Krent: редактируемый подзаголовок публичного хедера
--  «Licensed Realtor» под названием бренда был захардкожен —
--  выносим в brand_settings (white-label). Null → дефолт в коде.
-- ============================================================

alter table brand_settings
  add column if not exists header_tagline text;

comment on column brand_settings.header_tagline is
  'Uppercase subtitle under the brand name in the public header (e.g. "Licensed Realtor"). Null falls back to the built-in default.';
