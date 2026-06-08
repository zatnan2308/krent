-- ============================================================
--  Krent: универсальный стор переводов контента (Этап 5 i18n).
--
--  Базовые контент-таблицы (legal_documents, about_page,
--  about_milestones, page_intros, home_*, navigation_items,
--  amenities, amenity_categories, ...) хранят контент на ЯЗЫКЕ
--  ПО УМОЛЧАНИЮ организации (organizations.default_language).
--
--  Переводы на дополнительные включённые языки складываются сюда
--  оверлеем: пара (entity_type, entity_key) адресует строку базовой
--  таблицы, fields — jsonb переводимых полей этой строки. Публичное
--  чтение накладывает перевод на базу с field-level fallback: пустой
--  или отсутствующий перевод → значение из базовой строки.
--
--  entity_key:
--    legal_documents      → doc_key            ('privacy' | 'terms' | 'cookies')
--    about_page           → '' (singleton)
--    about_milestones     → about_milestones.id
--    page_intros          → page_key
--    home_hero/about/cta  → '' (singleton-на-организацию)
--    home_sections        → section key
--    home_* (списки)      → row id
--    navigation_items     → navigation_items.id
--    amenities            → amenities.id
--    amenity_categories   → amenity_categories.id
-- ============================================================

create table if not exists public.content_translations (
  organization_id uuid not null
    references public.organizations(id) on delete cascade,
  entity_type text not null,
  entity_key text not null default '',
  locale text not null,
  fields jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (organization_id, entity_type, entity_key, locale)
);

-- Горячий путь публичного чтения: все переводы домена для одной локали.
create index if not exists content_translations_lookup_idx
  on public.content_translations (organization_id, entity_type, locale);

alter table public.content_translations enable row level security;

-- Члены организации управляют своими переводами; чтение публичное —
-- та же модель, что и у базовых контент-таблиц (legal_documents,
-- about_page): сайт читает контент анонимно.
create policy "content_translations_member_all" on public.content_translations
  for all using (app_private.is_org_member(organization_id))
  with check (app_private.is_org_member(organization_id));
create policy "content_translations_public_read" on public.content_translations
  for select using (true);
