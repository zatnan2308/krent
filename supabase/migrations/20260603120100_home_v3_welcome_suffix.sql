-- ============================================================
--  Krent: welcome-заголовок главной v3 состоит из 3 частей —
--  lead (home_about.headline) + accent (headline_accent) + suffix.
--  Пример дизайна: "A single broker, [entirely] in your corner."
--  где [entirely] — золотое курсивное акцентное слово.
-- ============================================================

alter table home_about add column if not exists headline_suffix text;
