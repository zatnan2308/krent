-- ============================================================
--  Krent: настройки локализации организации
--  enabled_languages / enabled_currencies — списки доступных
--  языков и валют организации; measurement_system — система мер.
--  CHECK гарантирует, что язык/валюта по умолчанию входят в списки.
-- ============================================================

create type measurement_system as enum ('metric', 'imperial');

alter table organizations
  add column enabled_languages text[] not null default array['en']::text[],
  add column enabled_currencies text[] not null default array['USD']::text[],
  add column measurement_system measurement_system not null default 'metric';

alter table organizations
  add constraint organizations_default_language_enabled
    check (default_language = any (enabled_languages)),
  add constraint organizations_default_currency_enabled
    check (default_currency = any (enabled_currencies));
