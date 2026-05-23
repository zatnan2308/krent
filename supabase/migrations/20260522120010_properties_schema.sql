-- ============================================================
--  Krent: ядро объектов недвижимости (properties / listings)
--  11 таблиц. Каждая несёт organization_id. Мультиязычные поля —
--  в property_translations.
-- ============================================================

create type property_type as enum (
  'apartment',
  'house',
  'villa',
  'townhouse',
  'studio',
  'room',
  'commercial',
  'land',
  'office'
);
create type property_purpose as enum (
  'sale',
  'long_term_rent',
  'short_term_rental',
  'mixed'
);
create type property_status as enum (
  'draft',
  'active',
  'pending',
  'sold',
  'rented',
  'archived',
  'hidden'
);
create type property_visibility as enum ('public', 'private', 'unlisted');
create type price_period as enum ('sale', 'month', 'week', 'night');
create type price_display_type as enum ('visible', 'hidden', 'upon_request');
create type size_unit as enum ('sqm', 'sqft');
create type address_visibility as enum ('exact', 'approximate', 'hidden');
create type media_category as enum ('cover', 'gallery', 'floor_plan');
create type video_type as enum ('tour', 'realtor_review', 'virtual_tour');
create type document_type as enum ('brochure', 'other');

-- ---- amenity_categories (системные + кастомные) ------------
create table amenity_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  key text not null check (key ~ '^[a-z0-9_]+$'),
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create unique index amenity_categories_system_key
  on amenity_categories (key) where organization_id is null;
create unique index amenity_categories_org_key
  on amenity_categories (organization_id, key)
  where organization_id is not null;

-- ---- amenities (системные + кастомные) --------------------
create table amenities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  category_id uuid references amenity_categories(id) on delete set null,
  key text not null check (key ~ '^[a-z0-9_]+$'),
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create unique index amenities_system_key
  on amenities (key) where organization_id is null;
create unique index amenities_org_key
  on amenities (organization_id, key) where organization_id is not null;

-- ---- properties -------------------------------------------
create table properties (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  assigned_agent_id uuid references auth.users(id) on delete set null,
  co_agent_ids uuid[] not null default '{}'::uuid[],
  title text not null,
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  property_type property_type not null default 'apartment',
  purpose property_purpose not null default 'sale',
  status property_status not null default 'draft',
  visibility property_visibility not null default 'public',
  bedrooms integer check (bedrooms is null or bedrooms >= 0),
  bathrooms numeric(3, 1) check (bathrooms is null or bathrooms >= 0),
  beds integer check (beds is null or beds >= 0),
  guest_capacity integer check (guest_capacity is null or guest_capacity >= 0),
  size numeric(10, 2) check (size is null or size >= 0),
  size_unit size_unit not null default 'sqm',
  lot_size numeric(12, 2) check (lot_size is null or lot_size >= 0),
  floor integer,
  total_floors integer,
  year_built integer,
  parking integer check (parking is null or parking >= 0),
  garage boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

-- ---- property_translations --------------------------------
create table property_translations (
  property_id uuid not null references properties(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  locale text not null,
  title text not null,
  description text,
  slug_localized text,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (property_id, locale)
);
create unique index property_translations_localized_slug_uniq
  on property_translations (organization_id, locale, slug_localized)
  where slug_localized is not null;

-- ---- property_prices --------------------------------------
create table property_prices (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  amount numeric(14, 2) not null check (amount >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  price_period price_period not null default 'sale',
  old_amount numeric(14, 2) check (old_amount is null or old_amount >= 0),
  display_type price_display_type not null default 'visible',
  cleaning_fee numeric(12, 2),
  security_deposit numeric(12, 2),
  taxes numeric(12, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---- property_media (изображения) -------------------------
create table property_media (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  url text not null,
  storage_path text,
  alt text,
  caption text,
  category media_category not null default 'gallery',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---- property_videos --------------------------------------
create table property_videos (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  url text not null,
  type video_type not null default 'tour',
  title text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---- property_documents -----------------------------------
create table property_documents (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  url text not null,
  storage_path text,
  name text not null,
  type document_type not null default 'other',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---- property_amenities (связь M:N) -----------------------
create table property_amenities (
  property_id uuid not null references properties(id) on delete cascade,
  amenity_id uuid not null references amenities(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  primary key (property_id, amenity_id)
);

-- ---- property_locations (1:1 с объектом) ------------------
create table property_locations (
  property_id uuid primary key references properties(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  country text,
  city text,
  area text,
  address text,
  public_address text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  exact_address_visibility address_visibility not null default 'approximate',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---- nearby_places ----------------------------------------
create table nearby_places (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  category text,
  distance numeric(8, 2),
  distance_unit text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---- индексы ----------------------------------------------
create index idx_amenity_categories_organization
  on amenity_categories (organization_id);
create index idx_amenities_organization on amenities (organization_id);
create index idx_amenities_category on amenities (category_id);
create index idx_properties_organization on properties (organization_id);
create index idx_properties_org_status on properties (organization_id, status);
create index idx_properties_agent on properties (assigned_agent_id);
create index idx_property_translations_organization
  on property_translations (organization_id);
create index idx_property_prices_property on property_prices (property_id);
create index idx_property_prices_organization
  on property_prices (organization_id);
create index idx_property_media_property on property_media (property_id);
create index idx_property_media_organization
  on property_media (organization_id);
create index idx_property_videos_property on property_videos (property_id);
create index idx_property_videos_organization
  on property_videos (organization_id);
create index idx_property_documents_property
  on property_documents (property_id);
create index idx_property_documents_organization
  on property_documents (organization_id);
create index idx_property_amenities_amenity
  on property_amenities (amenity_id);
create index idx_property_amenities_organization
  on property_amenities (organization_id);
create index idx_property_locations_organization
  on property_locations (organization_id);
create index idx_nearby_places_property on nearby_places (property_id);
create index idx_nearby_places_organization
  on nearby_places (organization_id);

-- ---- updated_at триггеры ----------------------------------
create trigger trg_properties_updated_at
  before update on properties
  for each row execute function set_updated_at();
create trigger trg_property_translations_updated_at
  before update on property_translations
  for each row execute function set_updated_at();
create trigger trg_property_prices_updated_at
  before update on property_prices
  for each row execute function set_updated_at();
create trigger trg_property_locations_updated_at
  before update on property_locations
  for each row execute function set_updated_at();
