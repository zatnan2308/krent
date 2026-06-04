# Krent — Аудит админки администратора (2026-06-04)

> Полная инспекция дашборда (`src/app/(dashboard)/dashboard/`) по 7 функциональным
> областям. Цель: что логически неудобно лежит, что недоделано, что не работает,
> что добавить. Главный вывод: **бэкенд почти везде реально рабочий** (не mock), но
> есть несколько системных «обманок» — UI выглядит готовым, а функция мёртвая.
> Приоритеты: **P0** = не работает/вводит в заблуждение · **P1** = важно (UX/полнота/
> white-label) · **P2** = улучшения.

---

## ✅ Прогресс реализации (2026-06-04, всё в `main`)

**P0 — закрыты все 5:**
- ✅ P0-1 crons в vercel.json (`0e0b67a`)
- ✅ P0-2 Rentals hub `/dashboard/rentals` (`1893d87`)
- ✅ P0-3 сообщения: клиент-инициация + чат в /account + автоприглашение гостя при бронировании (`0c7636a`, `dbed117`)
- ✅ P0-4 диспетчер запланированных кампаний `/api/cron/campaigns-dispatch` (`643ae10`)
- ✅ P0-5 честный статус интеграций (pending вместо ложного connected) (`f5eca32`)

**P1 — закрыто 22 (из ~24):**
- ✅ P1-1/2 навигация: секции + фильтр по правам; «Clients»→«Client portals» (`38fb8da`)
- ✅ P1-3 занятые даты гостю + buffer_days (`e73e80a`)
- ✅ P1-4 интерактивный календарь: листание месяцев + occupancy % (`fe84159`)
- ✅ P1-5 organization.name редактируемое (`d4ed566`)
- ✅ P1-6 редактор seo_settings (`7541ef9`)
- ✅ P1-7 acquisition fees в brand_settings (white-label) (`0904ff1`)
- ✅ P1-8 Overview с реальными метриками (`b90191a`)
- ✅ P1-9 страница сделки `crm/deals/[id]` + редактирование + notes/tasks (`3047dca`)
- ✅ P1-10 задачи: overdue + cron-напоминания + назначение агенту (`822fe99`, `87a3849`, `94c698e`)
- ✅ P1-11 поиск/фильтр в объектах, контактах и лидах (`0ef6f44`, `ac8b3c7`, `7636080`)
- ✅ P1-12 медиа reorder/alt в UI (`ae45cdf`)
- ✅ P1-14 (часть) navigation reorder + inline edit пунктов (`5bc780f`)
- ✅ P1-15 письмо-приглашение в портал (`56d2fa6`)
- ✅ P1-16 смена пароля (`f91c50c`) + вкладка Domains (`c657ae0`)
- ✅ P1-17 «Client portals» + Portal access на карточке контакта (`a4eac2c`)

**Осталось (P1):**
- ⬜ P1-13 мультиязычный редактор объекта (`property_translations`/`slug_localized`) — крупный
- ⬜ P1-14 (хвост) вложенность/дропдауны навигации (`parent_id`), выбор `page_id`, остальные колонки футера

**P2 — закрыто частично:**
- ✅ «View public page» на объектах + превью-ссылки в home/about редакторах (`41e4dd7`, `f181ac0`)
- ✅ менеджер `nearby_places` на объекте (`a0bd3f4`)
- ✅ edit/reorder About-milestones (`aaa5391`)
- ✅ колокол уведомлений: unread-состояние + читаемые ярлыки (`ed6a1b7`)
- ✅ монограмма header/footer из названия бренда (white-label) (`3ed639c`)
- ✅ Bookings: поиск (код/гость) + фильтр источника + пагинация + колонка Source (`95fa495`)

**Осталось (P2):** остальное из раздела 4 ниже (open/click email-трекинг, карта в
локации объекта, множественные цены, профиль агента, превью в редакторах, колокол
read/unread, `syncReports` для GSC/Ads, и т.д.).

> Системный helper писем-приглашений: `src/features/portal/invite-email.ts`
> (`ensurePortalInvite`/`sendPortalInviteEmail`) + системный шаблон `portal.invited`
> (миграция `20260604170000`). Переиспользуется в booking и в inviteToPortal.

---

## 0. Прямые ответы на жалобы пользователя

### «Настройка доступных дат для букинга и просмотр резерваций не работает/неудобно»
Бэкенд аренды **сделан по-настоящему и сильно**: наглядный календарь-сетка с блокировками,
правила min/max stay и дни заезда, цены, защита от овербукинга, просмотр резерваций
(`/dashboard/bookings` — реальный список + детали + смена статуса + инвойс). НО неудобство
реально: (1) управление доступностью **разбросано по 3 карточкам** внутри
`properties/[id]/calendar` и доступно только из карточки конкретного объекта — нет единого
«центра аренды»; обзорный `/dashboard/calendar` только-чтение и фиксирован на 30 дней;
(2) **публичный календарь гостя не показывает занятые даты** — гость узнаёт о занятости
только после клика «Reserve»; (3) поле `buffer_days` сохраняется, но при бронировании
**не применяется** (мёртвая настройка).

### «Подключение календарей с booking.com и Airbnb не работает»
Механизм iCal **реально двусторонний и рабочий**: экспорт `.ics` (наш календарь → Airbnb/
Booking) с токеном, импорт `.ics` (их брони → к нам) с парсером, дедупом, логами sync, UI
для вставки ссылок (`import-manager.tsx`). **НО автоматической синхронизации нет:** cron-роут
`/api/cron/calendar-sync` написан корректно, но **в `vercel.json` отсутствует ключ `crons`** —
Vercel его никогда не вызывает. Импорт срабатывает только при ручном клике «Sync» по каждому
источнику → между кликами внешние брони не подтягиваются → **реальный риск овербукинга**.
⚠️ Документация (`docs/setup/deployment-vercel.md`) **врёт**, что crons настроены.

### «Сообщения не работают»
Движок чата **исправен** (реальные insert в `chat_messages`, RLS, Realtime-подписка, read-
статусы, вложения, email-уведомления). «Не работает» из-за организационных разрывов:
(1) **диалог нельзя создать из контекста** — `startConversation` вызывается только из формы
в админке; поля `lead_id`/`booking_id` в схеме есть, но никогда не заполняются;
(2) **клиент не может написать первым** (на портале форма создания диалога отсутствует);
(3) **жёсткое предусловие**: диалог стартует только если у клиента активирован портал
(`portal_accounts.user_id` + `status='active'`), а для гостя брони портал-аккаунт
автоматически **не создаётся**; (4) актуальный кабинет клиента `/account` показывает чат как
**список-ссылок на legacy `/portal/messages`** (другой дизайн), реальной ленты там нет.

---

## 1. Сквозные проблемы (бьют сразу по нескольким областям)

### 🔴 SX-1. Нет `crons` в `vercel.json` — три мёртвые фоновые функции
Единая корневая причина. Все три cron-роута написаны и корректны, но не вызываются:
- `/api/cron/calendar-sync` → iCal booking.com/Airbnb не синкается (овербукинг). [область 1]
- планировщик email-кампаний (`scheduleCampaign` ставит `scheduled`, отправлять некому). [область 6]
- `/api/cron/webhooks-retry` → ретраи webhook'ов Agent Sync зависают в `pending`. [область 6]
⚠️ **Оговорка Vercel Hobby**: на Hobby плане Cron ограничен (≈2 задачи, запуск раз в день) —
почасовой iCal-синк требует **Pro**. Та же история, что с регионом (см. HANDOFF §16).

### 🔴 SX-2. Битая ссылка «Rentals» → 404
Пункт меню `nav-config.ts:47` ведёт на `/dashboard/rentals`, но **страницы не существует**
(`src/features/rentals/` пуст, только `.gitkeep`). Права `rentals.view/manage` и модули в БД
есть — фича запланирована, но не создана. Самый заметный «не работает». [области 1, 7]

### 🔴 SX-3. Навигация — плоский список 20 пунктов, без группировки и без фильтра по правам
- 20 пунктов вперемешку (контент сайта + продажи + аренда + маркетинг + настройки). [область 7]
- `AppSidebar` рендерит **все** пункты всем — нет фильтра по `context.permissions`/`modules`
  (компонент их даже не получает). Клик по недоступному пункту → молчаливый редирект на
  главную. Данные не утекают (страницы защищены server-side), но UX плохой. Для ролей agent/
  staff (15/14 прав) видно ~20 пунктов, доступна треть.
- Отключение модуля в Settings **ни на что не влияет** в дашборде (гейта по модулям нет нигде).

### 🟡 SX-4. «Обманки» — UI выглядит рабочим, функция мёртвая (риск доверия)
Свести в одном месте, т.к. это вводит пользователя в заблуждение:
- Планировщик кампаний (кнопка «Schedule» + datetime) — рассылка **никогда не уйдёт**. [6]
- Integrations «Connect» (ручная форма) ставит зелёный бейдж **«Connected» без OAuth-токена**. [6]
- Дашборды Search Console / Google Ads / Meta Ads — полный UI, но `syncReports()` = no-op →
  **вечные нули** даже с ключами (не хватает не только ключей, а целого слоя синхронизации). [6]
- Campaign report «Delivered/Opened/Clicked» — всегда 0 (нет open/click-вебхуков). [6]
- `buffer_days` в правилах аренды — сохраняется, не применяется. [1]
- Промокоды бронирования — `resolvePromoCode` всегда null (TODO). [1]

---

## 2. P0 — критично (чинить первым)

| # | Что | Область | Сложность |
|---|---|---|---|
| P0-1 | Включить `crons` в `vercel.json` (calendar-sync, webhooks-retry, campaigns-dispatch) + привести в порядок документацию; проверить Hobby/Pro лимиты | 1,6 | S (но зависит от плана Vercel) |
| P0-2 | Починить «Rentals» 404 — создать hub аренды (список rentable-объектов + occupancy + быстрый доступ к календарю + агрегированные iCal-логи) **или** редирект на `/calendar` | 1,7 | M |
| P0-3 | Сообщения: автосоздавать `portal_account`(guest)+conversation с `booking_id` при бронировании; встроить реальную ленту чата в `/account`; дать клиенту инициировать диалог; «Message host» → реальный диалог по брони | 2 | L |
| P0-4 | Планировщик кампаний: реализовать через cron **или** скрыть кнопку «Schedule» (оставить «Send now»), чтобы не терять рассылки | 6 | S/M |
| P0-5 | Integrations: убрать ложный «Connected» — ручной connect ставит `pending`, `connected` только после OAuth с токеном | 6 | S |

## 3. P1 — важно (UX, полнота, white-label)

| # | Что | Область | Сложность |
|---|---|---|---|
| P1-1 | Навигация: группировка по секциям (Overview / Sales&CRM / Properties&Rentals / Communication / Growth / Website / Settings) | 7 | M |
| P1-2 | Навигация: фильтр пунктов по правам и модулям (прокинуть `permissions`/`modules` в `AppSidebar`) | 7 | M |
| P1-3 | Доступность дат: единый экран управления (блокировки+правила+цены) + показывать занятые даты в публичном виджете гостя + применить или убрать `buffer_days` | 1 | L |
| P1-4 | `/dashboard/calendar`: листание месяцев, блокировка из сетки, фильтр по объекту, occupancy % | 1 | M |
| P1-5 | **white-label**: `organization.name` редактируемое из Settings (сейчас никак — а это siteName везде) | 5 | S |
| P1-6 | Редактор `seo_settings` (title suffix, default meta, og image, robots.txt, GSC verification) — таблица есть, UI нет | 5 | M |
| P1-7 | Property-detail: вынести Dubai-бизнес-числа (DLD 4% / agency 2% / registration 0.25%) и заголовки секций в настройки/БД | 5 | M |
| P1-8 | Overview: реальные виджеты (активные объекты, новые лиды 7д, ближайшие заезды, задачи на сегодня, непрочитанные, выручка) | 7 | M |
| P1-9 | CRM: страница detail сделки (`crm/deals/[id]`) + редактирование сделки (сумма/валюта/дата/агент) + заметки/задачи к сделке | 4 | M |
| P1-10 | CRM: задачи — подсветка overdue + напоминания (cron→bell/email) + назначение другому агенту | 4 | M |
| P1-11 | CRM/Properties: поиск + фильтры + пагинация в списках лидов, контактов, объектов | 3,4 | M |
| P1-12 | Properties: подключить готовые actions медиа (reorder/alt) к UI; единый Publish-контрол + превью | 3 | S/M |
| P1-13 | Properties: мультиязычный редактор объекта (`property_translations`/`slug_localized`) | 3 | L |
| P1-14 | Navigation v2: reorder (drag), вложенность/дропдауны (`parent_id`), выбор `page_id`, inline-edit, остальные колонки футера | 5 | L |
| P1-15 | Приглашение в портал отправляет письмо автоматически (сейчас ссылку копируют руками) | 4 | S |
| P1-16 | Settings: смена пароля + вкладка Domains (таблица `domains` и права уже есть) | 7 | M |
| P1-17 | Переименовать пункт «Clients» → «Client portals»; на карточке контакта — блок Portal access (Invite/Revoke) | 4 | S |

## 4. P2 — улучшения

- Open/click-трекинг писем (пиксель+редирект или Resend `opened`/`clicked` вебхуки) → оживит метрики кампаний и Reports. [6]
- Карта в локации объекта (выбор точки кликом + геокодинг), менеджер `nearby_places`. [3]
- Множественные цены объекта (sale+rent для `mixed`), сезонные цены. [3]
- Загрузка документов/видео объекта в Storage (не только URL). [3]
- Сущность агента: таблица профилей (bio, RERA, phone, специализация, фото) + редактор; использовать на `/agents/[id]` и «Listed by». [5]
- Превью во всех контент-редакторах (минимум «открыть в новой вкладке»). [5]
- Колокол уведомлений: read/unread, человекочитаемые ярлыки вместо `event_type`. [7]
- Свести два CMS-контура: `PageRenderer` в editorial-обёртке; мультиязычность в `PageEditor`. [5]
- Вынести «обвязку» About/Contact/Catalog (монограмма «AK», «Licensed Realtor», RERA, районы Дубая в футере) в редактируемые поля. [5]
- Логотип-фолбэк «AK» → инициалы из `organization.name`. [5]
- Реализовать `syncReports()` для GSC/Google Ads/Meta (требует ключей пользователя). [6]
- Meta CAPI server-side (token уже хранится). [6]
- ✅ Bookings: поиск (код/гость/email/тел) + фильтр источника + пагинация + колонка Source (`95fa495`). Осталось: диапазон дат, серверный PDF-инвойс. [1]
- Авто-рефреш сегментов рассылки при появлении контактов. [6]
- Задействовать `lead_sources` (сейчас мёртвая таблица) + аналитика по источникам/attribution. [4]
- Лента активности (timeline) на лиде/контакте/сделке из `audit_logs`. [4]

---

## 5. Детально по областям

### Область 1 — Аренда / Бронирования / Календарь / iCal
- ✅ Bookings список/деталь/инвойс, BookingManager (confirm/cancel/complete/refund), календарь-сетка
  с блокировками, правила доступности/цен, iCal экспорт+импорт+логи — **всё реально пишет в БД**.
- 🔴 «Rentals» 404 · cron iCal не подключён (овербукинг) · 🟡 `buffer_days` не применяется ·
  промокоды заглушка · ⚠️ доступность разбросана, обзорный календарь read-only/30 дней,
  гостю не видны занятые даты.
- Ключевое: `src/features/rental-calendar/*`, `src/features/bookings/*` (pricing.ts, booking-widget-editorial.tsx),
  `src/app/api/calendar/*`, `src/app/api/cron/calendar-sync`, `vercel.json`.

### Область 2 — Сообщения / Чат
- ✅ actions/queries/realtime/уведомления/RLS — движок корректен.
- 🔴 диалоги не создаются из лида/брони (`lead_id`/`booking_id` не заполняются) · клиент не
  инициирует · предусловие активного портала почти всегда не выполнено (нет автосоздания для
  гостей) · `/account` чат = ссылки на legacy `/portal/messages`.
- ⚠️ Realtime хрупкий (молчаливый catch, не подтверждено что включён в проекте Supabase).
- Ключевое: `src/features/chat/*`, `src/features/account/account-app.tsx` (MessagesView),
  `src/features/portal/actions.ts` (invite/accept), `dashboard/messages`, `portal/messages`.

### Область 3 — Объекты недвижимости
- ✅ CRUD объекта (8 вкладок), загрузка медиа в Storage, цены/локация/удобства/видео/документы,
  публикация по status+visibility, богатые webhooks — **рабочее ядро**.
- 🟡 список без поиска/фильтров/пагинации (главный экран портфеля отстал) · создание = 3 поля ·
  **нет мультиязычного редактора** (пишет одну локаль) · медиа reorder/alt **actions написаны, к
  UI не подключены** · цена — одна строка (нет sale+rent для mixed) · локация без карты ·
  `assigned_agent_id`/`co_agent_ids`/`nearby_places` из UI не правятся.
- Ключевое: `src/features/properties/{property-form,property-create-form,actions,media-actions,
  property-media-manager,dashboard-queries}.ts`.

### Область 4 — CRM / Клиенты / Лиды / Сделки / Задачи
- ✅ **Зрелый рабочий CRM**: лиды реально прилетают с сайта (4 источника + booking), attribution
  (UTM/click-ids/geo), смена статуса/assign/convert-to-deal/заметки/задачи, kanban сделок по
  стадиям, CRUD задач, CSV-импорт, invite в портал.
- 🟡 нет detail-страницы сделки и редактирования сделки · задачи без напоминаний/overdue · нет
  поиска/фильтров/пагинации в лидах/контактах · контакт read-only · назначить лид/задачу можно
  только себе · приглашение в портал не шлёт письмо · `lead_sources` мёртвая · нет timeline.
- «CRM» vs «Clients» — **не дубль** (Clients = управление `portal_accounts`), но именование в меню
  путает; управление контактом размазано по двум разделам.
- Ключевое: `src/features/crm/*`, `src/features/portal/*`, `dashboard/crm/**`, `dashboard/clients`.

### Область 5 — Контент / CMS / Редактируемость фронта
- ✅ Home (10 таблиц, 12 вкладок), About/Sell/Agents intro, Legal, контакты/соцсети/футер —
  редактируемы.
- 🔴 **white-label**: `organization.name` не редактируется (siteName везде) · `seo_settings` без
  редактора · бизнес-числа property-detail захардкожены под Дубай · Navigation примитив (нет
  reorder/вложенности, footer 1 из 4 колонок) · два несвязанных CMS-контура (generic `pages`
  рендерится не в editorial-дизайне, моноязычен).
- 🟡 много «обвязки» захардкожено (монограмма AK, Licensed Realtor, RERA, районы Дубая) · профиль
  агента нередактируем · ни одного превью · вкладка Home→Process сохраняет, но на сайте не
  рендерится.
- Ключевое: `src/features/{home,cms,about,page-intros,legal,settings}/*`, `src/app/[locale]/*`,
  `src/components/layout/public-{header,footer}.tsx`, `src/server/public-site.ts`.

### Область 6 — Email / Marketing / SEO / Analytics / Reports / Integrations / Agent Sync
- ✅ **РЕАЛЬНО (8 стр.)**: Email+шаблоны (Resend, лог `email_sends`), Marketing (campaigns/segments/
  contacts — реальная рассылка с отпиской), Analytics (свои события, инжект GA4/GTM/Pixel), Reports
  (6 реальных агрегатов), Agent Sync (продакшен-уровня исходящий agency API: ключи/фиды/виджет/
  webhooks/HMAC).
- 🟡 SEO (аудит реален; sitemap/robots из БД; «Search Console tracking» — placeholder).
- 🔴 **ЗАГЛУШКИ (5 стр.)**: Integrations hub + Search Console/Google Ads/Meta Ads дашборды —
  `syncReports()` no-op → нули даже с ключами; ложный «Connected» без токена; планировщик кампаний
  не отправляет.
- Ключевое: `src/features/{notifications,campaigns,marketing,seo,analytics,reports,integrations,
  agency-api}/*`, `src/app/api/{email,analytics,integrations,cron}/*`, `vercel.json`.

### Область 7 — Структура / Settings / Навигация / Права
- ✅ AppShell (sidebar+topbar+mobile), контекст организации с кэшем, RBAC в БД (37 прав, 4 роли,
  102 связки), Settings — 6 рабочих вкладок (Profile/Branding/Site&contact/Localization/Modules/Team).
- 🔴 меню без группировки и без фильтра по правам/модулям · «Rentals» 404.
- 🟡 Overview пустой (метаданные, не метрики) · колокол = лог писем без read/unread · Settings без
  смены пароля и доменов · некоторые страницы без `view`-gate (`properties`, `pages`).
- Ключевое: `src/components/layout/{app-sidebar,app-topbar,nav-config,dashboard-layout}.tsx`,
  `src/features/settings/*`, `src/server/{permissions,organization-context}.ts`.

---

## 6. Предлагаемая навигация (группировка меню)

Заменить плоский `dashboardNav` на массив групп; порядок — операционка сверху, контент/настройки снизу:

```
OVERVIEW            Dashboard
SALES & CRM         CRM · Client portals (= ныне Clients)
PROPERTIES & RENT   Properties · Rentals(hub) · Bookings · Calendar
COMMUNICATION       Messages(badge) · Email
GROWTH              Marketing · SEO · Analytics · Reports · Integrations · Agent Sync
WEBSITE / CONTENT   Home page · Pages · Navigation · About page
SETTINGS            Settings
```
+ фильтровать пункты по `context.permissions`/`context.modules` (Super Admin видит всё).

---

## 7. Рекомендуемая последовательность работ

1. **Быстрые победы / «обманки» (P0-1,4,5 + SX-2)** — cron, скрыть/починить планировщик, убрать
   ложный «Connected», починить «Rentals». Малый объём, снимают самые заметные «не работает».
2. **Сообщения (P0-3)** — автосоздание портала+диалога для гостей, чат в `/account`. Прямая жалоба.
3. **Доступность дат + календарь (P1-3,4)** — единый центр аренды, занятость гостю. Прямая жалоба.
4. **Навигация (P1-1,2) + Overview (P1-8)** — «что неудобно лежит» + полезный вход.
5. **White-label (P1-5,6,7)** — name, seo_settings, бизнес-числа из БД.
6. **CRM/Properties полнота (P1-9..13,15..17)** — detail сделки, задачи, поиск/фильтры, медиа, мультиязык.
7. **P2** — по мере необходимости.

> При старте каждого пункта: паттерн HANDOFF §6, миграции через MCP в проект
> `pclhwbgsxdztriqdtosg`, типы вручную, typecheck/lint/build, commit+push, отчёт на русском.
