-- ============================================================
--  Krent: каталожные атрибуты объекта для фильтров /properties
--  (новый дизайн каталога). Все поля аддитивные и nullable —
--  редактируются в админке объекта, фильтруются на странице.
--    listing_view    — вид (Sea view, Marina view, …)
--    furnishing      — Furnished / Semi-furnished / Unfurnished
--    completion      — Ready / Off-plan · Q3 2027 / …
--    ownership       — Freehold / Leasehold
--    rental_yield    — ожидаемая доходность, % (например 7.2)
--    lifestyle_tags  — теги образа жизни (Beachfront, Investment, …)
--    badge           — бейдж на карточке (Off-market, New, Off-plan)
-- ============================================================

alter table properties add column if not exists listing_view text;
alter table properties add column if not exists furnishing text;
alter table properties add column if not exists completion text;
alter table properties add column if not exists ownership text;
alter table properties add column if not exists rental_yield numeric(4,1);
alter table properties
  add column if not exists lifestyle_tags text[] not null default '{}'::text[];
alter table properties add column if not exists badge text;
