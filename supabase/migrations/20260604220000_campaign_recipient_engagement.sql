-- ============================================================
--  Krent: вовлечённость получателей кампаний
--  Отметки delivered/opened/clicked на каждом получателе — наполняют
--  агрегаты campaign_reports из вебхуков Resend (open/click tracking).
-- ============================================================

alter table public.campaign_recipients
  add column if not exists delivered_at timestamptz,
  add column if not exists opened_at timestamptz,
  add column if not exists clicked_at timestamptz;
