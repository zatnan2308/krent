-- ============================================================
--  Krent CRM — блок D: параметры поиска объекта покупателем.
--  Дополняет contact_buyer_profiles: тип сделки, тип объекта, районы,
--  спальни/санузлы, площадь, бюджет, must-have и заметки.
-- ============================================================

alter table public.contact_buyer_profiles
  add column if not exists deal_type text,
  add column if not exists property_type text,
  add column if not exists locations text[] not null default '{}'::text[],
  add column if not exists beds_min integer,
  add column if not exists baths_min numeric(4, 1),
  add column if not exists area_min numeric(12, 2),
  add column if not exists area_max numeric(12, 2),
  add column if not exists budget_min numeric(14, 2),
  add column if not exists budget_max numeric(14, 2),
  add column if not exists must_have text,
  add column if not exists search_notes text;
