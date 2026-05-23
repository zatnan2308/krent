-- ============================================================
--  Krent: системные стартовые шаблоны email-кампаний. Новая
--  кампания создаётся копированием блоков выбранного шаблона.
-- ============================================================

insert into campaign_templates
  (organization_id, name, description, is_system, blocks)
values
  (
    null,
    'Property newsletter',
    'Featured listings with an agent card.',
    true,
    '[
      {"type":"header","content":{"text":"Latest properties"}},
      {"type":"hero","content":{"url":"","alt":"Featured property"}},
      {"type":"text","content":{"text":"Hand-picked homes selected for you this month."}},
      {"type":"property_grid","content":{"propertyIds":[]}},
      {"type":"agent_card","content":{"name":"","title":"Your agent","email":"","phone":"","photoUrl":""}},
      {"type":"footer","content":{"text":""}},
      {"type":"unsubscribe","content":{}}
    ]'::jsonb
  ),
  (
    null,
    'Simple announcement',
    'A short text update with a call-to-action button.',
    true,
    '[
      {"type":"header","content":{"text":"An update from our team"}},
      {"type":"text","content":{"text":"Share your news with clients here."}},
      {"type":"button","content":{"label":"Learn more","url":""}},
      {"type":"divider","content":{}},
      {"type":"footer","content":{"text":""}},
      {"type":"unsubscribe","content":{}}
    ]'::jsonb
  );
