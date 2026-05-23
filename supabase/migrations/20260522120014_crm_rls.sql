-- ============================================================
--  Krent: RLS, права и seed для CRM-модуля.
--  Лиды/сделки/задачи видны назначенному агенту либо обладателю
--  crm.manage_all. Контакты и заметки — общие в пределах орг.
--  Публичные формы пишут лиды через сервис-клиент (минуя RLS).
-- ============================================================

-- ---- Включение RLS ----------------------------------------
alter table contacts enable row level security;
alter table lead_sources enable row level security;
alter table leads enable row level security;
alter table deal_stages enable row level security;
alter table deals enable row level security;
alter table tasks enable row level security;
alter table notes enable row level security;
alter table lead_attribution enable row level security;
alter table saved_searches enable row level security;
alter table favorite_properties enable row level security;

-- ---- contacts (общий справочник организации) --------------
create policy "contacts_select"
  on contacts for select to authenticated
  using (app_private.has_permission(organization_id, 'crm.view'));
create policy "contacts_insert"
  on contacts for insert to authenticated
  with check (app_private.has_permission(organization_id, 'crm.manage'));
create policy "contacts_update"
  on contacts for update to authenticated
  using (app_private.has_permission(organization_id, 'crm.manage'))
  with check (app_private.has_permission(organization_id, 'crm.manage'));
create policy "contacts_delete"
  on contacts for delete to authenticated
  using (app_private.has_permission(organization_id, 'crm.manage_all'));

-- ---- lead_sources / deal_stages (справочники) -------------
create policy "lead_sources_select"
  on lead_sources for select to authenticated
  using (
    organization_id is null
    or app_private.has_permission(organization_id, 'crm.view')
  );
create policy "lead_sources_write"
  on lead_sources for all to authenticated
  using (
    organization_id is not null
    and app_private.has_permission(organization_id, 'crm.manage_all')
  )
  with check (
    organization_id is not null
    and app_private.has_permission(organization_id, 'crm.manage_all')
  );

create policy "deal_stages_select"
  on deal_stages for select to authenticated
  using (
    organization_id is null
    or app_private.has_permission(organization_id, 'crm.view')
  );
create policy "deal_stages_write"
  on deal_stages for all to authenticated
  using (
    organization_id is not null
    and app_private.has_permission(organization_id, 'crm.manage_all')
  )
  with check (
    organization_id is not null
    and app_private.has_permission(organization_id, 'crm.manage_all')
  );

-- ---- leads (назначенный агент либо crm.manage_all) --------
create policy "leads_select"
  on leads for select to authenticated
  using (
    app_private.has_permission(organization_id, 'crm.view')
    and (
      assigned_agent_id = auth.uid()
      or app_private.has_permission(organization_id, 'crm.manage_all')
    )
  );
create policy "leads_insert"
  on leads for insert to authenticated
  with check (app_private.has_permission(organization_id, 'crm.manage'));
create policy "leads_update"
  on leads for update to authenticated
  using (
    app_private.has_permission(organization_id, 'crm.manage')
    and (
      assigned_agent_id = auth.uid()
      or app_private.has_permission(organization_id, 'crm.manage_all')
    )
  )
  with check (
    app_private.has_permission(organization_id, 'crm.manage')
    and (
      assigned_agent_id = auth.uid()
      or app_private.has_permission(organization_id, 'crm.manage_all')
    )
  );
create policy "leads_delete"
  on leads for delete to authenticated
  using (app_private.has_permission(organization_id, 'crm.manage_all'));

-- ---- deals ------------------------------------------------
create policy "deals_select"
  on deals for select to authenticated
  using (
    app_private.has_permission(organization_id, 'crm.view')
    and (
      assigned_agent_id = auth.uid()
      or app_private.has_permission(organization_id, 'crm.manage_all')
    )
  );
create policy "deals_insert"
  on deals for insert to authenticated
  with check (app_private.has_permission(organization_id, 'crm.manage'));
create policy "deals_update"
  on deals for update to authenticated
  using (
    app_private.has_permission(organization_id, 'crm.manage')
    and (
      assigned_agent_id = auth.uid()
      or app_private.has_permission(organization_id, 'crm.manage_all')
    )
  )
  with check (
    app_private.has_permission(organization_id, 'crm.manage')
    and (
      assigned_agent_id = auth.uid()
      or app_private.has_permission(organization_id, 'crm.manage_all')
    )
  );
create policy "deals_delete"
  on deals for delete to authenticated
  using (app_private.has_permission(organization_id, 'crm.manage_all'));

-- ---- tasks (исполнитель, создатель либо crm.manage_all) ---
create policy "tasks_select"
  on tasks for select to authenticated
  using (
    app_private.has_permission(organization_id, 'crm.view')
    and (
      assigned_agent_id = auth.uid()
      or created_by = auth.uid()
      or app_private.has_permission(organization_id, 'crm.manage_all')
    )
  );
create policy "tasks_insert"
  on tasks for insert to authenticated
  with check (
    app_private.has_permission(organization_id, 'crm.manage')
    and created_by = auth.uid()
  );
create policy "tasks_update"
  on tasks for update to authenticated
  using (
    app_private.has_permission(organization_id, 'crm.manage')
    and (
      assigned_agent_id = auth.uid()
      or created_by = auth.uid()
      or app_private.has_permission(organization_id, 'crm.manage_all')
    )
  )
  with check (app_private.has_permission(organization_id, 'crm.manage'));
create policy "tasks_delete"
  on tasks for delete to authenticated
  using (
    app_private.has_permission(organization_id, 'crm.manage')
    and (
      created_by = auth.uid()
      or app_private.has_permission(organization_id, 'crm.manage_all')
    )
  );

-- ---- notes (общие в орг; правка/удаление — автор) ---------
create policy "notes_select"
  on notes for select to authenticated
  using (app_private.has_permission(organization_id, 'crm.view'));
create policy "notes_insert"
  on notes for insert to authenticated
  with check (
    app_private.has_permission(organization_id, 'crm.manage')
    and author_id = auth.uid()
  );
create policy "notes_update"
  on notes for update to authenticated
  using (
    app_private.has_permission(organization_id, 'crm.manage')
    and (
      author_id = auth.uid()
      or app_private.has_permission(organization_id, 'crm.manage_all')
    )
  )
  with check (app_private.has_permission(organization_id, 'crm.manage'));
create policy "notes_delete"
  on notes for delete to authenticated
  using (
    app_private.has_permission(organization_id, 'crm.manage')
    and (
      author_id = auth.uid()
      or app_private.has_permission(organization_id, 'crm.manage_all')
    )
  );

-- ---- lead_attribution (только чтение в дашборде) ----------
create policy "lead_attribution_select"
  on lead_attribution for select to authenticated
  using (app_private.has_permission(organization_id, 'crm.view'));

-- ---- saved_searches / favorite_properties -----------------
create policy "saved_searches_select"
  on saved_searches for select to authenticated
  using (app_private.has_permission(organization_id, 'crm.view'));
create policy "saved_searches_write"
  on saved_searches for all to authenticated
  using (app_private.has_permission(organization_id, 'crm.manage'))
  with check (app_private.has_permission(organization_id, 'crm.manage'));

create policy "favorite_properties_select"
  on favorite_properties for select to authenticated
  using (app_private.has_permission(organization_id, 'crm.view'));
create policy "favorite_properties_write"
  on favorite_properties for all to authenticated
  using (app_private.has_permission(organization_id, 'crm.manage'))
  with check (app_private.has_permission(organization_id, 'crm.manage'));

-- ---- Право доступа ко всему CRM организации ----------------
insert into permissions (key, description) values
  ('crm.manage_all', 'Доступ ко всем лидам, сделкам и задачам организации.')
on conflict (key) do nothing;

insert into role_permissions (role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.key = 'crm.manage_all'
where r.organization_id is null
  and r.key in ('org_owner', 'org_admin')
on conflict do nothing;

-- ---- Seed системных источников лидов ----------------------
insert into lead_sources (organization_id, key, name, sort_order) values
  (null, 'website', 'Website', 1),
  (null, 'property_inquiry', 'Property inquiry', 2),
  (null, 'showing_request', 'Showing request', 3),
  (null, 'valuation_request', 'Valuation request', 4),
  (null, 'rental_inquiry', 'Rental inquiry', 5),
  (null, 'booking', 'Booking', 6),
  (null, 'external_website', 'External website', 7),
  (null, 'referral', 'Referral', 8),
  (null, 'phone', 'Phone call', 9),
  (null, 'manual', 'Manual entry', 10)
on conflict do nothing;

-- ---- Seed системных стадий сделок -------------------------
insert into deal_stages
  (organization_id, key, name, sort_order, is_won, is_lost)
values
  (null, 'new', 'New', 1, false, false),
  (null, 'contacted', 'Contacted', 2, false, false),
  (null, 'viewing', 'Viewing', 3, false, false),
  (null, 'negotiation', 'Negotiation', 4, false, false),
  (null, 'won', 'Won', 5, true, false),
  (null, 'lost', 'Lost', 6, false, true)
on conflict do nothing;
