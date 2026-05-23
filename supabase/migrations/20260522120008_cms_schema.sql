-- ============================================================
--  Krent: схема публичного CMS
--  Управляемые страницы, переводы страниц, навигационные меню,
--  SEO-настройки и редиректы. Каждая таблица несёт organization_id.
-- ============================================================

create type page_type as enum (
  'home',
  'about',
  'buy',
  'sell',
  'rent',
  'contact',
  'custom',
  'landing'
);

create type page_status as enum ('draft', 'published');

-- ---- pages ------------------------------------------------
create table pages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  type page_type not null default 'custom',
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  status page_status not null default 'draft',
  template text not null default 'default',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

-- ---- page_translations ------------------------------------
-- organization_id денормализован для RLS и уникальности слагов.
-- content хранит структуру { version, blocks[] } (расширяема под builder).
create table page_translations (
  page_id uuid not null references pages(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  locale text not null,
  title text not null,
  content jsonb not null default '{"version": 1, "blocks": []}'::jsonb,
  seo_title text,
  seo_description text,
  og_image_url text,
  slug_localized text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (page_id, locale)
);

create unique index page_translations_localized_slug_uniq
  on page_translations (organization_id, locale, slug_localized)
  where slug_localized is not null;

-- ---- navigation_menus -------------------------------------
create table navigation_menus (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  key text not null check (key ~ '^[a-z0-9_]+$'),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, key)
);

-- ---- navigation_items -------------------------------------
create table navigation_items (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references navigation_menus(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  parent_id uuid references navigation_items(id) on delete cascade,
  page_id uuid references pages(id) on delete set null,
  label text not null,
  url text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---- seo_settings (1:1 с организацией) --------------------
create table seo_settings (
  organization_id uuid primary key
    references organizations(id) on delete cascade,
  default_title text,
  title_suffix text,
  default_description text,
  default_og_image_url text,
  robots_txt text,
  google_site_verification text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---- redirects --------------------------------------------
create table redirects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  source_path text not null,
  destination_path text not null,
  status_code integer not null default 301
    check (status_code in (301, 302, 307, 308)),
  created_at timestamptz not null default now(),
  unique (organization_id, source_path)
);

-- ---- индексы ----------------------------------------------
create index idx_pages_organization on pages (organization_id);
create index idx_pages_org_status on pages (organization_id, status);
create index idx_page_translations_organization
  on page_translations (organization_id);
create index idx_navigation_menus_organization
  on navigation_menus (organization_id);
create index idx_navigation_items_menu on navigation_items (menu_id);
create index idx_navigation_items_organization
  on navigation_items (organization_id);
create index idx_navigation_items_parent on navigation_items (parent_id);
create index idx_navigation_items_page on navigation_items (page_id);
create index idx_redirects_organization on redirects (organization_id);

-- ---- updated_at триггеры ----------------------------------
create trigger trg_pages_updated_at
  before update on pages
  for each row execute function set_updated_at();
create trigger trg_page_translations_updated_at
  before update on page_translations
  for each row execute function set_updated_at();
create trigger trg_navigation_menus_updated_at
  before update on navigation_menus
  for each row execute function set_updated_at();
create trigger trg_navigation_items_updated_at
  before update on navigation_items
  for each row execute function set_updated_at();
create trigger trg_seo_settings_updated_at
  before update on seo_settings
  for each row execute function set_updated_at();
