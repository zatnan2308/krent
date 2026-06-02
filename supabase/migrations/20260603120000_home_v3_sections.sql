-- ============================================================
--  Krent: главная страница v3 (дизайн "home-v3").
--  Аддитивно к 20260524100000_home_page_content. Новые секции
--  нового дизайна, всё редактируется из /dashboard/home:
--    - home_sections        — заголовки секций (eyebrow/lead/accent)
--                             + баннер Subscribe (subtitle/image)
--    - home_intent_options  — секция "How can I help you?" (карточки)
--    - home_reasons         — секция "Why work with Alexey"
--    - home_stats           — секция Advantage (крупные цифры)
--    + новые поля welcome в home_about (headline_accent/body_2/cta_*)
--  RLS: публичное чтение (контент главной виден анониму);
--  запись идёт через service-role admin client после проверки прав.
-- ============================================================

-- ---- home_sections: редактируемые заголовки секций + Subscribe ----
create table if not exists home_sections (
  organization_id uuid not null
    references organizations(id) on delete cascade,
  section_key text not null,
  eyebrow text,
  lead text,
  accent text,
  subtitle text,
  body text,
  image_url text,
  updated_at timestamptz not null default now(),
  primary key (organization_id, section_key)
);

-- ---- home_intent_options: "How can I help you?" ----
create table if not exists home_intent_options (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references organizations(id) on delete cascade,
  sort_order integer not null default 0,
  title text not null,
  description text,
  href text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_home_intent_org
  on home_intent_options (organization_id, sort_order);

-- ---- home_reasons: "Why work with Alexey" ----
create table if not exists home_reasons (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references organizations(id) on delete cascade,
  sort_order integer not null default 0,
  title text not null,
  body text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_home_reasons_org
  on home_reasons (organization_id, sort_order);

-- ---- home_stats: секция Advantage (крупные цифры) ----
create table if not exists home_stats (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references organizations(id) on delete cascade,
  sort_order integer not null default 0,
  value text not null,
  suffix text,
  label text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_home_stats_org
  on home_stats (organization_id, sort_order);

-- ---- новые поля секции welcome (home_about) ----
alter table home_about add column if not exists headline_accent text;
alter table home_about add column if not exists body_2 text;
alter table home_about
  add column if not exists cta_label text not null default 'More about me';
alter table home_about
  add column if not exists cta_href text not null default '/about';

-- ---- updated_at triggers ----
create or replace trigger trg_home_sections_updated before update on home_sections
  for each row execute function set_updated_at();
create or replace trigger trg_home_intent_updated before update on home_intent_options
  for each row execute function set_updated_at();
create or replace trigger trg_home_reasons_updated before update on home_reasons
  for each row execute function set_updated_at();
create or replace trigger trg_home_stats_updated before update on home_stats
  for each row execute function set_updated_at();

-- ---- RLS: публичное чтение ----
alter table home_sections enable row level security;
alter table home_intent_options enable row level security;
alter table home_reasons enable row level security;
alter table home_stats enable row level security;

drop policy if exists "home_sections_public_read" on home_sections;
create policy "home_sections_public_read" on home_sections for select using (true);
drop policy if exists "home_intent_public_read" on home_intent_options;
create policy "home_intent_public_read" on home_intent_options for select using (true);
drop policy if exists "home_reasons_public_read" on home_reasons;
create policy "home_reasons_public_read" on home_reasons for select using (true);
drop policy if exists "home_stats_public_read" on home_stats;
create policy "home_stats_public_read" on home_stats for select using (true);
