# Krent — HANDOFF (полное состояние проекта)

> Дата среза: **2026-06-04**. Это самодостаточный документ для продолжения работы
> в новой сессии (фокус: **админка администратора + функционал сайта**).
> Локальный путь: `D:\krent`. Ветка `main`, авто-деплой на Vercel при push.
> Перед правками: `git status` → прочитать целевой файл → сделать этап →
> `npm run typecheck && npm run lint && npm run build` → commit → push.

---

## 1. Продукт
**Krent** — white-label платформа недвижимости и аренды (НЕ сайт одного риэлтора).
Продаётся как готовый продукт (не подписочный SaaS), но архитектура **multi-tenant**:
один код обслуживает много организаций/агентств/доменов. Демо-инсталляция — риэлтор
**Alexey Kachan, Dubai**. Домены: продажа, долгосрочная и посуточная аренда, direct
booking, календарь + iCal sync, CRM, порталы покупателя/продавца/гостя, клиентский
кабинет, чат, мультиязык/мультивалюта, SEO, аналитика, email, Agency API/widget,
Super Admin.

## 2. Жёсткие ограничения (НЕ нарушать)
- Каждая бизнес-сущность — по `organization_id`; RBAC с самого начала.
- **Никакого AI** (ни фич, ни «coming soon»).
- **Без тарифов** (MVP/Pro/Enterprise/upgrade). Один полный продукт. Модули можно
  включать/выключать в Super Admin, но не как upsell. License = контроль копий/доменов.
- Секреты только на сервере; внешние API — через серверные route handlers.
- Production-ready, модульно, **без костылей**, **не выдумывать данные** (если в БД
  нет поля — секция/значение скрывается, фейк недопустим).
- Общение и комментарии в коде — **на русском** (идентификаторы/типы — англ.).
- Поэтапно, после этапа — проверка (typecheck/lint/build) + короткий отчёт.

## 3. Стек
Next.js **14.2.x** (App Router) · React 18.3 · TypeScript 5.9 strict
(`noUncheckedIndexedAccess`, `noUnusedLocals/Parameters`) · Tailwind 3.4 · Supabase
(Postgres 17, Auth, Storage, RLS) `@supabase/ssr` · Stripe 22 · PayPal/Crypto
(adapter) · Resend 6 (email) · zod 4 · react-hook-form · date-fns · lucide-react ·
Radix UI/shadcn (в дашборде) · Node ≥18.17. Шрифты next/font: **Spectral**
(`--font-spectral`, serif) + **Inter** как Geist (`--font-geist`). Деплой — Vercel.

## 4. Внешние системы и доступы
- **Supabase (Krent, рабочая):** ref `pclhwbgsxdztriqdtosg`,
  `https://pclhwbgsxdztriqdtosg.supabase.co`. **Регион `eu-west-1` (Ирландия)** — важно
  для перформанса (см. §16). Подключена через MCP-коннектор (миграции/SQL/типы/advisors
  напрямую). ⚠️ На том же аккаунте ЧУЖОЙ проект **Kfit** ref `dwvlzpnnwrqvmvvfjknk` —
  НИКОГДА туда не писать; всегда проверять ref.
- **GitHub:** `https://github.com/zatnan2308/krent.git`, ветка `main`.
- **Vercel:** авто-деплой при push в main. Реальные env-ключи живут в Vercel.
  ⚠️ Регион функций — см. §16 (должен быть Dublin/EU рядом с Supabase).

## 5. Структура репозитория
```
src/
  app/
    layout.tsx              ← root: шрифты + globals.css
    [locale]/               ← публичный сайт (en/fr/es/uk/ru): page.tsx (home),
                              properties/[slug], listings, buy, rent, vacation-rentals,
                              about, contact, sell, agents, agents/[id], privacy, terms,
                              cookies, homes-for-sale/*, [...slug] (CMS), loading.tsx
    (auth)/                 ← login, sign-up, forgot-password, reset-password + layout
    (dashboard)/dashboard/  ← кабинет риэлтора/агентства (все модули) + loading.tsx
    (super-admin)/super-admin
    account/                ← клиентский кабинет (page+layout+loading)
    portal/                 ← buyer/seller/guest/messages/accept + loading
    api/                    ← route handlers
  components/  ui (shadcn), layout (public-header/footer/layout, floating-actions,
               nav-config, app-shell/dashboard-layout, auth-layout УДАЛЁН), shared
  features/    ← бизнес-логика по доменам (см. §7)
  lib/         supabase/, env.ts, currency/, i18n/, seo/, constants/routes.ts, branding/
  server/      auth.ts, organization-context.ts, permissions.ts, public-site.ts, audit.ts
  middleware.ts
  types/database.ts        ← типы Supabase (дописывать вручную, см. §13)
supabase/migrations/        ← .sql миграции (последняя 20260604160000)
docs/
HANDOFF.md  ← этот файл
```

## 6. Архитектурные паттерны
- **Multi-tenant:** всё по `organization_id`. Публичная org резолвится по домену:
  `resolvePublicOrganization()` / `getPublicSiteContext()` (`src/server/public-site.ts`,
  кэш `unstable_cache` tag `public-site`). `PublicSiteContext = { organization, brand
  (brand_settings), seo }`.
- **RLS:** helper-функции в схеме `app_private` (SECURITY DEFINER): `is_org_member`,
  `has_permission`, `is_super_admin`, `can_view/edit_property`,
  `is_conversation_participant`. Публичное чтение — политики `using (true)`.
- **Supabase-клиенты** (`src/lib/supabase/server.ts`): `createClient()` (анон/SSR под
  RLS), `createAdminClient()` (service role, мимо RLS — для записи после проверки прав
  и для кэшируемых публичных чтений по доверенному id).
- **Server actions** в `"use server"`; вход валидируется zod; запись — admin-клиентом
  после `requireOrganizationContext()` + `hasPermission(ctx, key)`.
- **Org context** (`server/organization-context.ts`): `getOrganizationContext()` обёрнут
  в React `cache()` (1 раз на запрос); тяжёлые данные (orgs/role/permissions/modules) —
  в `unstable_cache` по `(userId, activeOrgId)`, revalidate 30s, tag `ORG_CONTEXT_TAG`
  (`"org-context"`). Меняющие права/модули/членство actions делают `revalidateTag`.
- **getCurrentUser/getCurrentUserShallow** (`server/auth.ts`) — в `cache()`.
- **Env** (`src/lib/env.ts`): ленивая валидация `getClientEnv()/getServerEnv()`,
  `SKIP_ENV_VALIDATION`. Все публичные/дашборд страницы `export const dynamic =
  "force-dynamic"`.
- **Кэш контента:** `unstable_cache` + `revalidateTag`. Теги: `public-site`,
  `home-content`, `about-content`, `page-intros`, `legal-docs`, `org-context`.
- **ПАТТЕРН нового редактируемого контента** (повторять для новых разделов админки):
  1) таблица (`organization_id` + RLS: member-all + public-read) →
  2) admin-query c `unstable_cache`+tag →
  3) server action (upsert + `revalidateTag` + permission `branding.manage`) →
  4) редактор (shadcn) на dashboard-странице →
  5) публичный рендер с дефолт-фолбэком (если поле пусто — показать дефолт, не пусто).
- **Имена агентов/пользователей:** из Supabase Auth `user_metadata` (профильной
  таблицы нет), закэшировано (`server/user-directory.ts`, `getAgentNameById`).

## 7. Модули (src/features/*)
organizations, auth, localization, cms (pages + **navigation** header/footer),
home, properties (+ catalog, mortgage-calculator, hero-gallery, viewing-form),
rentals/rental-calendar, bookings (+ booking-widget-editorial), payments, crm
(lead-actions→submitLead), portal (buyer/seller/**guest**), **account** (клиент.
кабинет), chat (Realtime), notifications/email (Resend), campaigns/marketing, seo,
analytics, integrations (OAuth-каркас), agency-api/api-access, agents, reports,
settings, contact, **about**, **page-intros**, **legal**.

## 8. База данных (Supabase `pclhwbgsxdztriqdtosg`, ~105 таблиц, RLS везде)
Регенерация типов: MCP `generate_typescript_types` отдаёт ~213KB ОДНОЙ строкой
(слишком большой для прямой записи) → **дописывать типы вручную** в `src/types/
database.ts` (alphabetical, блоки Row/Insert/Update/Relationships).
- **Tenant/RBAC:** organizations, organization_members, organization_modules, roles,
  permissions, role_permissions, modules, brand_settings, domains, licenses,
  audit_logs, platform_admins.
- **brand_settings** (расширена): + contact_email/phone/whatsapp/**messenger**/address,
  office_hours, response_time, footer_tagline, newsletter_title/blurb,
  social_instagram/linkedin/facebook/x/youtube.
- **CMS:** pages, page_translations, navigation_menus, navigation_items, seo_settings,
  redirects. **page_intros** (org+page_key → eyebrow/heading/subheading: sell, agents).
  **legal_documents** (org+doc_key → title/body markdown-lite: privacy/terms/cookies).
- **About:** **about_page** (org → hero_title/story_heading/story_body/quote_1/quote_2),
  **about_milestones** (org → year/title/body/sort_order).
- **Properties:** properties (+ listing_view/furnishing/completion/ownership/
  rental_yield/lifestyle_tags[]/badge/guest_capacity и пр.), property_translations,
  property_prices, property_media, property_videos, property_documents, amenities,
  amenity_categories, property_amenities, property_locations, nearby_places,
  property_sync_settings, property_external_visibility.
- **Home (CMS главной):** home_hero, home_about, home_cta, home_markets,
  home_process_steps, home_testimonials, home_trust_badges, home_press_logos,
  home_sections, home_intent_options, home_reasons, home_stats.
- **CRM:** contacts, leads, lead_sources, deals, deal_stages, tasks, notes,
  lead_attribution, saved_searches, favorite_properties.
- **Portal:** portal_accounts (user_id → contact_id + organization_id + portal_type).
- **Chat:** chat_conversations, chat_participants, chat_messages, chat_attachments,
  message_reads.
- **Rental calendar / Bookings / Payments:** rental_calendars, rental_calendar_events,
  rental_availability_rules (min_stay/check_in_days), rental_price_rules,
  ical_*; rental_bookings (guest_contact_id, adults/children, check_in/out, nights,
  total, currency, status, payment_status, reference), rental_guests, rental_fees,
  rental_payments; payment_providers/accounts/transactions/webhooks, refunds,
  crypto_payment_proofs.
- **Notifications/Email, Campaigns/Marketing, Analytics (tracking_settings),
  Integrations, Agency API** — см. features.
- **Миграции (timestamp_name):** последние мои —
  20260604120000 brand_contact_fields · 130000 about_page_content ·
  140000 page_intros · 150000 legal_documents · 160000 brand_messenger.

## 9. Маршруты
- **Public** `[locale]/`: `/` home, `/properties`(→`/listings`), `/listings /buy /rent
  /vacation-rentals` (каталог v2), `/properties/[slug]` (детальная: buy→ипотека/
  acquisition/investment, vacation→booking-виджет; общий hero-gallery), `/about`,
  `/contact`, `/sell`, `/agents`, `/agents/[id]`, `/privacy /terms /cookies` (из БД),
  area `/homes-for-sale/[city]([area])` и пр., CMS `[...slug]`.
- **Auth** `(auth)`: `/login /sign-up /forgot-password /reset-password` (split-screen
  AuthShell).
- **Dashboard** `(dashboard)/dashboard`: home, pages, navigation, **about** (редактор
  about+sell/agents intro+legal), properties(+[id]/new/amenities/[id]/calendar), crm,
  clients, rentals, bookings, calendar, messages, email, marketing, seo, analytics,
  reports, integrations, agent-sync, settings.
- **Account** `/account` — клиентский кабинет (Trips/Saved/Messages/Payments/Profile).
- **Portal** `/portal`: buyer/seller/guest/messages/accept.
- **Super-admin** `(super-admin)/super-admin`: organizations(+[id]), users, licenses,
  health.
- **API** `/api`: health, calendar, cron, payments/webhook/*, email/webhook,
  marketing/unsubscribe, analytics/event, auth/sign-out, integrations/oauth/*,
  public/v1/* (agents/properties/leads/showing/booking/widget.js).
- `ROUTES` — централизованы в `src/lib/constants/routes.ts`.

## 10. Дизайн-система (editorial)
Скоуп `.editorial` в `src/styles/globals.css` (публичный сайт; дашборд = shadcn).
Токены 1:1 совпадают с дизайн-бандлами Claude Design. Палитра (БЕЛЫЙ фон):
`--bg-primary:#FFFFFF`, `--bg-secondary:#F4F4F2`, `--bg-elevated:#FFFFFF`,
`--border-subtle:#E8E7E2`, `--border-medium:#D2D0C9`, `--text-primary:#131311`,
`--text-secondary:#4A4842`, `--text-tertiary:#6F6C63`, `--accent:#8B7340`,
`--accent-muted: rgba(139,115,64,0.08)`, `--accent-line: rgba(139,115,64,0.30)`.
`.on-dark` — светлый текст на тёмном (accent `#D4B574`). `.ed-light-panel` —
сброс on-dark обратно к светлой палитре (дропдауны над тёмным hero). Классы:
`.serif`(Spectral), `.eyebrow`(`.gold`,`.dot`), `.btn`/`.btn-primary/ghost/solid/
text`, `.arrow`, `.tnum`, `.grain`, `.drop-cap`, `.img-hover`. Geist Mono —
литералом `"'Geist Mono', ui-monospace, monospace"` (переменная не подключена).

## 11. Env (.env.local — не коммитится)
```
NEXT_PUBLIC_APP_NAME=Krent
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://pclhwbgsxdztriqdtosg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon JWT>            # MCP get_publishable_keys
SUPABASE_SERVICE_ROLE_KEY=<service_role>            # SERVER ONLY, из дашборда Supabase
# опц.: STRIPE_*, PAYPAL_*, RESEND_*, CRON_SECRET, ENCRYPTION_KEY, GOOGLE_OAUTH_*, META_*
```
⚠️ Локально `.env.local` с ПЛЕЙСХОЛДЕР service-role → admin-запросы не работают,
рендер с данными проверять на Vercel.

## 12. Git workflow
Ветка **main** → push → Vercel авто-деплой. Коммиты: conventional
(`feat(scope):`/`fix`/`perf`/`style`/`content:`), тело — буллеты на англ. Завершать:
`Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
Windows: предупреждения «LF→CRLF» — норма. PowerShell + git: многострочный
commit-msg писать в файл и `git commit -F file.txt` (here-string ломается на
кавычках). `git push ...` печатает прогресс в stderr (PowerShell помечает как
ошибку) — смотреть на строку `xx-yy main -> main` (это успех).

## 13. Сборка / проверка
`npm run typecheck` · `npm run lint` · `npm run build` — прогонять ВСЕ три после
этапа. Edit-инструмент требует точного совпадения; иногда требует свежий Read
перед Write/Edit. Типы Supabase в database.ts дописывать вручную.

## 14. Что уже сделано (последние сессии)
**Дизайн-апдейт (editorial, всё в main):** белый фон; home v3; каталог v2
(deal-режим Buy/Rent/Stay в шапке, slide-in drawer фильтров ≤1024px, карточки по
deal); детальная buy (ипотека/acquisition/investment) и vacation (booking-виджет +
«Good to know»); **hero-gallery 1:1** (82vh, eyebrow над заголовком, thumbnail внутри,
«View all photos»+lightbox — `src/features/properties/property-hero-gallery.tsx`);
contact (split + боксовая форма); auth (split-screen AuthShell, 4 страницы; signup
+phone −confirm); account (`/account` ПОЛНАЯ фича на реальных данных: rental_bookings/
payments/favorites/chat, связь user→contact через portal_accounts; delete=запрос-лид);
guest portal на реальных бронях.

**Редактируемость публичного фронта (всё из админки, permission `branding.manage`):**
- **Settings → «Site & contact»** (`updateSiteContact`): контакты (email/phone/whatsapp/
  messenger/address/hours/response), соцсети, тексты футера (tagline/newsletter).
  Публично: header (phone), footer (tagline/newsletter/socials/contacts), `/contact`,
  плавающая кнопка связи (WhatsApp/Messenger/Email).
- **Navigation:** меню header + footer из БД (`navigation_menus` key header/footer),
  `getPublicNavigation` (admin+cache). Редактор dashboard/navigation — оба меню.
  Header без меню → дефолт Home/Properties/About/Contact.
- **dashboard/about** (раздел «About page»): редактирует /about (hero/story/quotes/
  timeline через about_page + about_milestones), intro /sell и /agents (page_intros),
  и **Legal** (legal_documents: privacy/terms/cookies, markdown-lite `## h2`,`- list`).
- **Home, Pages (CMS), Properties** — редакторы были и раньше.

## 15. Что админка УЖЕ умеет редактировать (карта для продолжения)
| Публичная часть | Где редактируется |
|---|---|
| Главная (8 секций) | dashboard/home |
| Произвольные CMS-страницы | dashboard/pages → `[...slug]` |
| Меню header + footer | dashboard/navigation |
| Контакты/соцсети/футер/плавающая кнопка | dashboard/settings → Site & contact |
| About (hero/story/timeline) | dashboard/about |
| Sell / Agents заголовки | dashboard/about (Other page headings) |
| Privacy/Terms/Cookies | dashboard/about (Legal pages) |
| Объекты, цены, медиа, удобства | dashboard/properties |
| Брендинг (цвета/лого/CSS), локализация, модули, команда | dashboard/settings |

## 16. ПРОИЗВОДИТЕЛЬНОСТЬ (важно — была главная боль, частично решено)
Performance-advisors Supabase = 0 (БД здорова). Лаг был от количества/географии
запросов. Сделанные фиксы (все в main):
- **Middleware** (`0f0fb97`): `getUser()` (сетевой Supabase Auth) теперь ТОЛЬКО для
  protected (`/dashboard /super-admin /portal /account`) + `/login`. Публичные идут
  без сетевого auth (только locale). Было — на КАЖДЫЙ запрос/навигацию/prefetch.
- **loading.tsx** (`7c4e71c`) во всех сегментах → мгновенный переход + индикатор
  (без них force-dynamic держал на старой странице).
- **Org context** (`06d0c28`+`3510912`): React `cache()` (1 раз на запрос вместо
  layout+page) + параллелизация + `unstable_cache` 30s по (userId,activeOrgId).
  `getPublicTrackingConfig` закэширован.
- ⚠️ **РЕГИОН (`32d115c`) — ГЛАВНЫЙ оставшийся фактор:** Supabase в **eu-west-1
  (Ирландия)**, Vercel по умолчанию в US → каждый round-trip через Атлантику ~100ms.
  `vercel.json` → `"regions": ["dub1"]` (Dublin). **НО на Vercel Hobby план это может
  не примениться** — проверить/выставить ВРУЧНУЮ: Vercel → Project → Settings →
  Functions → Region = Dublin/EU, затем Redeploy. Если Hobby не даёт сменить регион —
  нужен Pro, либо мигрировать Supabase в US-регион.
- Если всё ещё медленно: рассмотреть ISR вместо force-dynamic для публичных страниц
  (сложно из-за multi-tenant резолва по домену через headers()), уменьшение
  client-бандла, отключение prefetch на массовых ссылках каталога.

## 17. Подводные камни
- ⚠️ Не путать Supabase-проекты (Kfit `dwvlzpnnwrqvmvvfjknk` — чужой). Всегда ref.
- `.env.local` локально с плейсхолдер service-role → рендер с данными только на Vercel.
- enum `property_type` НЕ содержит «penthouse» (хранится как apartment).
- `/properties` редиректит на `/listings`.
- Дизайн-ссылки Claude Design (handoff) ВРЕМЕННЫЕ — протухают; просить свежие. Каждый
  бандл — полный экспорт всех страниц в `untitled/project/*` (html+jsx+components+
  styles.css). Токены styles.css = наш `.editorial`. При «implement X.html» переносить
  и HERO целиком, не только тело.
- Мок-данные прототипов, которых НЕТ в БД (не переносить/не выдумывать): sleeping-rooms
  (vacation), floor-plan SVG, payment-plan 20/10/70, appreciation/avg-rent, rating/
  reviews объектов, координаты для map-view каталога.
- `generate_typescript_types` (MCP) = 213KB одной строкой → типы дописывать вручную.
- React `cache()` ОБЯЗАТЕЛЕН для server-функций, вызываемых из layout+page (context,
  user) — иначе дублируются запросы.

## 18. Что дальше / TODO (для админки + функционала)
**Незавершённое в портале** (требует новой инфраструктуры, сейчас честные плейсхолдеры):
- Appointments (запись на показ): нет таблицы. Новая таблица appointments + запись из
  карточки объекта → лента в buyer/seller/guest.
- Documents портала: приватный bucket + signed-URL шеринг агент↔клиент.
- Per-property analytics для seller: агрегация `analytics_events` по объекту.

**Маркетинг/интеграции** (требуют ВНЕШНИХ ключей пользователя — каркас есть, помечено
«requires credentials»): Google/Meta Ads отчёты, OAuth-подключения (Search Console/
Google Ads/Meta), Meta CAPI, Consent Mode-баннер, планирование рассылок, image-sitemap,
блог.

**Видимые клиенту фичи без внешних ключей** (можно сделать по паттерну §6):
- Промокоды бронирования (booking — каркас в pricing, реальное применение).
- Cookie-consent баннер (текущий cookie-banner статичен).

**Возможные улучшения админки:** редактор area-страниц (homes-for-sale/* — сейчас
SEO-генерируемые), редактор контактов из brand_settings уже есть; вынести RERA-номер/
office-данные contact page в brand_settings (сейчас часть — дефолты-константы).

## 19. Чек-лист новой сессии
1. Прочитать этот HANDOFF.md + авто-память (MEMORY.md подхватится).
2. `git status` (ожидается чистый main в синхроне с origin).
3. Уточнить у пользователя задачу (админка/функционал) и точный scope.
4. Для нового редактируемого контента — паттерн §6 (таблица+RLS → cached query →
   action+revalidateTag → редактор → публичный рендер с дефолтом).
5. Миграции — через MCP `apply_migration` (project `pclhwbgsxdztriqdtosg`!) + .sql файл
   в supabase/migrations + дописать типы вручную в database.ts.
6. typecheck → lint → build после этапа; commit (стиль §12) + push; отчёт на русском.
7. Если жалоба на скорость — сначала §16 (регион Vercel!), потом advisors/logs (MCP).
