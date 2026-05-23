-- ============================================================
--  Krent: seed системных данных
--  Системные модули, права и роли. Идемпотентно (ON CONFLICT).
--  Системные роли имеют organization_id = NULL и is_system = true.
-- ============================================================

-- ---- Системные модули -------------------------------------
insert into modules (key, name, description) values
  ('properties', 'Properties', 'Каталог объектов недвижимости.'),
  ('sales', 'Sales', 'Продажа объектов недвижимости.'),
  ('long_term_rental', 'Long-term Rental', 'Долгосрочная аренда.'),
  ('short_term_rental', 'Short-term Rental', 'Посуточная аренда.'),
  ('bookings', 'Bookings', 'Прямое бронирование и резервации.'),
  ('crm', 'CRM', 'Лиды, контакты и сделки.'),
  ('payments', 'Payments', 'Платежи и выплаты.'),
  ('crypto_payments', 'Crypto Payments', 'Криптовалютные платежи (опционально).'),
  ('calendar', 'Calendar', 'Календарь и синхронизация iCal.'),
  ('chat', 'Chat', 'Чат клиента с риелтором.'),
  ('email', 'Email', 'Транзакционные email-уведомления.'),
  ('email_campaigns', 'Email Campaigns', 'Email-рассылки и конструктор писем.'),
  ('seo', 'SEO', 'SEO-движок и Search Console.'),
  ('analytics', 'Analytics', 'Аналитика и UTM-атрибуция.'),
  ('marketing', 'Marketing', 'Интеграции Google Ads и Meta Ads.'),
  ('buyer_portal', 'Buyer Portal', 'Портал покупателя.'),
  ('seller_portal', 'Seller Portal', 'Портал продавца.'),
  ('guest_portal', 'Guest Portal', 'Портал гостя.'),
  ('api_access', 'API Access', 'Внешний API, feed и виджет.')
on conflict (key) do nothing;

-- ---- Системные права --------------------------------------
insert into permissions (key, description) values
  ('organization.view', 'Просмотр организации.'),
  ('organization.update', 'Изменение настроек организации.'),
  ('members.view', 'Просмотр участников.'),
  ('members.invite', 'Приглашение участников.'),
  ('members.manage', 'Управление участниками.'),
  ('roles.view', 'Просмотр ролей.'),
  ('roles.manage', 'Управление ролями и правами.'),
  ('modules.view', 'Просмотр модулей.'),
  ('modules.manage', 'Включение и отключение модулей.'),
  ('branding.manage', 'Управление брендингом.'),
  ('domains.view', 'Просмотр доменов.'),
  ('domains.manage', 'Управление доменами.'),
  ('licenses.view', 'Просмотр лицензий.'),
  ('audit.view', 'Просмотр журнала аудита.'),
  ('properties.view', 'Просмотр объектов недвижимости.'),
  ('properties.create', 'Создание объектов недвижимости.'),
  ('properties.update', 'Изменение объектов недвижимости.'),
  ('properties.delete', 'Удаление объектов недвижимости.'),
  ('crm.view', 'Просмотр CRM.'),
  ('crm.manage', 'Управление CRM.'),
  ('rentals.view', 'Просмотр аренды.'),
  ('rentals.manage', 'Управление арендой.'),
  ('bookings.view', 'Просмотр бронирований.'),
  ('bookings.manage', 'Управление бронированиями.'),
  ('payments.view', 'Просмотр платежей.'),
  ('payments.manage', 'Управление платежами.'),
  ('calendar.view', 'Просмотр календаря.'),
  ('calendar.manage', 'Управление календарём.'),
  ('analytics.view', 'Просмотр аналитики.'),
  ('marketing.manage', 'Управление маркетингом.'),
  ('seo.manage', 'Управление SEO.'),
  ('email.manage', 'Управление email.')
on conflict (key) do nothing;

-- ---- Системные роли ---------------------------------------
insert into roles (organization_id, key, name, description, is_system) values
  (null, 'org_owner', 'Owner',
    'Владелец организации: полный доступ.', true),
  (null, 'org_admin', 'Administrator',
    'Администратор организации.', true),
  (null, 'agent', 'Agent',
    'Риелтор: операционная работа.', true),
  (null, 'staff', 'Staff',
    'Сотрудник: ограниченный доступ.', true)
on conflict do nothing;

-- ---- Права ролей ------------------------------------------
-- org_owner: все права.
insert into role_permissions (role_id, permission_id)
select r.id, p.id
from roles r
cross join permissions p
where r.organization_id is null
  and r.key = 'org_owner'
on conflict do nothing;

-- org_admin: все права, кроме просмотра лицензий.
insert into role_permissions (role_id, permission_id)
select r.id, p.id
from roles r
cross join permissions p
where r.organization_id is null
  and r.key = 'org_admin'
  and p.key <> 'licenses.view'
on conflict do nothing;

-- agent: операционные права.
insert into role_permissions (role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.key in (
  'organization.view',
  'members.view',
  'properties.view',
  'properties.create',
  'properties.update',
  'crm.view',
  'crm.manage',
  'rentals.view',
  'rentals.manage',
  'bookings.view',
  'bookings.manage',
  'calendar.view',
  'calendar.manage',
  'analytics.view'
)
where r.organization_id is null
  and r.key = 'agent'
on conflict do nothing;

-- staff: только права просмотра.
insert into role_permissions (role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.key like '%.view'
where r.organization_id is null
  and r.key = 'staff'
on conflict do nothing;
