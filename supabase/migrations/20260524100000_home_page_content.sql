-- ============================================================
--  Krent: контент главной страницы (editorial layout).
--  Per-organization настройки Hero / About / CTA + списки
--  Markets / Process / Testimonials / Trust / Press.
--  Всё редактируется из /dashboard/home.
-- ============================================================

create table home_hero (
  organization_id uuid primary key
    references organizations(id) on delete cascade,
  background_image_url text,
  eyebrow_text text not null default 'Licensed Realtor',
  eyebrow_chips text[] not null default array[]::text[],
  headline_top text not null default 'Property, found',
  headline_bottom_italic text not null default 'personally.',
  subtitle text not null default 'Apartments, villas and investment opportunities — handled by one person, not a platform.',
  primary_cta_label text not null default 'Browse properties',
  primary_cta_href text not null default '/properties',
  secondary_cta_label text not null default 'Speak with me',
  secondary_cta_href text not null default '/contact',
  updated_at timestamptz not null default now()
);

create table home_about (
  organization_id uuid primary key
    references organizations(id) on delete cascade,
  eyebrow_text text not null default 'Why I work this way',
  headline text not null default 'One realtor. Four jurisdictions. Two hundred closed deals.',
  body text not null default '',
  portrait_url text,
  metric_1_value text default '8+', metric_1_label text default 'years on the market',
  metric_2_value text default '200+', metric_2_label text default 'closed deals',
  metric_3_value text default '5★', metric_3_label text default 'average client rating',
  metric_4_value text default '1h', metric_4_label text default 'typical reply time',
  updated_at timestamptz not null default now()
);

create table home_cta (
  organization_id uuid primary key
    references organizations(id) on delete cascade,
  eyebrow_text text not null default 'Speak with me',
  headline_left text not null default 'Tell me what you',
  headline_italic text not null default 'actually',
  headline_right text not null default 'need.',
  subtitle text not null default 'One message. One reply within the hour.',
  primary_cta_label text not null default 'Send a message',
  primary_cta_href text not null default '/contact',
  secondary_cta_label text not null default 'More about me',
  secondary_cta_href text not null default '/about',
  updated_at timestamptz not null default now()
);

create table home_markets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  sort_order integer not null default 0,
  name text not null,
  region text,
  badge text,
  blurb text,
  image_url text,
  href text,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_home_markets_org on home_markets (organization_id, sort_order);

create table home_process_steps (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  sort_order integer not null default 0,
  step_number text not null,
  title text not null,
  body text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_home_process_org on home_process_steps (organization_id, sort_order);

create table home_testimonials (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  sort_order integer not null default 0,
  quote text not null,
  author_name text,
  deal_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_home_testimonials_org on home_testimonials (organization_id, sort_order);

create table home_trust_badges (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  sort_order integer not null default 0,
  label text not null,
  sub text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_home_trust_org on home_trust_badges (organization_id, sort_order);

create table home_press_logos (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  sort_order integer not null default 0,
  name text not null,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_home_press_org on home_press_logos (organization_id, sort_order);

create trigger trg_home_hero_updated before update on home_hero
  for each row execute function set_updated_at();
create trigger trg_home_about_updated before update on home_about
  for each row execute function set_updated_at();
create trigger trg_home_cta_updated before update on home_cta
  for each row execute function set_updated_at();
create trigger trg_home_markets_updated before update on home_markets
  for each row execute function set_updated_at();
create trigger trg_home_process_updated before update on home_process_steps
  for each row execute function set_updated_at();
create trigger trg_home_testimonials_updated before update on home_testimonials
  for each row execute function set_updated_at();
create trigger trg_home_trust_updated before update on home_trust_badges
  for each row execute function set_updated_at();
create trigger trg_home_press_updated before update on home_press_logos
  for each row execute function set_updated_at();

alter table home_hero enable row level security;
alter table home_about enable row level security;
alter table home_cta enable row level security;
alter table home_markets enable row level security;
alter table home_process_steps enable row level security;
alter table home_testimonials enable row level security;
alter table home_trust_badges enable row level security;
alter table home_press_logos enable row level security;

create policy "home_hero_public_read" on home_hero for select using (true);
create policy "home_about_public_read" on home_about for select using (true);
create policy "home_cta_public_read" on home_cta for select using (true);
create policy "home_markets_public_read" on home_markets for select using (true);
create policy "home_process_public_read" on home_process_steps for select using (true);
create policy "home_testimonials_public_read" on home_testimonials for select using (true);
create policy "home_trust_public_read" on home_trust_badges for select using (true);
create policy "home_press_public_read" on home_press_logos for select using (true);
