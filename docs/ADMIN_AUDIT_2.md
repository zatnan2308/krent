# Krent — Admin Audit Round 2 (2026-06-05)

> Свежий полный аудит админки после UI/UX-редизайна. 6 областей прочитаны вглубь
> (страницы + server actions + queries + schema/RLS). Severity: **P0** = сломано/
> вводит в заблуждение · **P1** = важно · **P2** = улучшение. Все пункты с `file:line`.
> Демо для продажи: фичи на внешних ключах покупателя (OAuth интеграций, live-синк
> Google/Meta/GSC, Meta CAPI) — ожидаемые заглушки, помечены «demo».

---

## 0. TL;DR — что чинить перед продажей (топ)
1. **Cron нигде не запускается** → 4 мёртвые фоновые функции + UI врёт «синк ежечасно».
2. **Овербукинг**: брони пишутся read-then-insert без DB-констрейнта на пересечение дат.
3. **Consent Mode инвертирован** (`granted` без согласия) + cookie-баннер косметический → GDPR-риск.
4. **Утечки между агентами**: колокол уведомлений и бейдж непрочитанных показывают чужое.
5. **Integrations**: ручной Connect ставит зелёный «Connected» без токена.
6. **mixed-объект**: rent-цена молча превращается в sale при перезагрузке редактора.
7. **About-редактор**: открывается по `organization.view`, но Save требует `branding.manage` → все сохранения падают.
8. **Home-вкладки Process/Press/CTA** сохраняются, но на публичном сайте не рендерятся.

---

## A. Инфраструктура (ставит покупатель, но UI сейчас врёт)

- **P0 | нет cron-планировщика** — `.github/workflows/cron.yml` отсутствует, `CRON_SECRET` не задан, в `vercel.json` нет `crons`. Не работают: `/api/cron/calendar-sync` (iCal-синк Airbnb/Booking → **риск овербукинга**), `campaigns-dispatch` (кнопка **Schedule** молча ничего не шлёт), `webhooks-retry`, `task-reminders` (напоминания о задачах не уходят). Эндпоинты корректны — нет триггера. **Фиксится сейчас:** убрать/переписать вводящие в заблуждение тексты (`rentals/page.tsx:306-308` «Automatic sync runs hourly»; деплой-доки) + приложить workflow (его коммитит покупатель — токен без scope `workflow`).

---

## B. Баги (чинятся в коде сейчас)

### B1. Данные / целостность
- **P0 | `bookings/actions.ts:328-347` + `rental-calendar/actions.ts:82-92`** — овербукинг: read-then-insert без exclusion/unique-констрейнта на `rental_calendar_events`. Две параллельные брони проходят обе; комментарий «dates no longer available» срабатывает только на ошибке insert, которой при пересечении НЕ возникает. **Фикс:** Postgres `EXCLUDE USING gist (property_id =, daterange(start,end) &&)` (нужен `btree_gist`) → ловить как «занято». (миграция)
- **P1 | `properties/dashboard-queries.ts:117-126` (+ `actions.ts:226-249`, `queries.ts:601-605`)** — mixed-объект с rent-only: эвристика «sale = НЕ-rent период» кладёт rent-строку в слот sale → при перезагрузке редактор показывает «Sale price», следующий Save переписывает аренду в продажу. Та же логика ломает публичный показ. **Фикс:** для `mixed` всегда писать основную как sale, выбирать rent по period, а не по «не sale».
- **P1 | `payments/webhook.ts:121-133`** — повторно доставленный Stripe/PayPal event падает на unique-idempotency индексе `(provider, external_event_id)` → HTTP 500, провайдер ретраит бесконечно. **Фикс:** upsert/ignore-on-conflict, short-circuit если event уже есть, вернуть 200.
- **P2 | `payments/actions.ts:344-357` (`issueRefund`)** — рефанд валидируется против суммы последнего платежа, не вычитая прошлые рефанды → два частичных могут превысить captured. **Фикс:** cap по `amount − sum(succeeded refunds)`.
- **P2 | `properties/actions.ts:230-238`** — цены `delete-all-then-insert` без транзакции: если insert упадёт после delete — у объекта 0 цен. **Фикс:** RPC/транзакция.
- **P2 | `rental-calendar/sync.ts:72-104`** — iCal-импорт delete-then-insert per source без транзакции: при сбое insert даты source-а стираются до следующего синка (окно овербукинга). **Фикс:** upsert по `(import_source_id, external_uid)` (индекс уже есть).

### B2. Приватность / безопасность
- **P1 | `crm/queries.ts:610-642` + `notifications/queries-bell.ts:12-28`** — колокол уведомлений фильтрует только по `organization_id`, не по получателю → каждый агент видит последние 10 уведомлений всей орг-ии, включая чужие email (`recipient_email`) и типы событий (PII коллег). **Фикс:** `recipient_user_id = context.user.id`.
- **P1 | `chat/unread-queries.ts:8-30`** — бейдж «Messages» считает непрочитанное в диалогах, где агент **не участник** (admin-клиент мимо RLS, фильтр только по org). **Фикс:** join через `chat_participants` с `user_id`.

### B3. Вводит в заблуждение (misleading UI)
- **P1 | `integrations/actions.ts:78-90`** — ручной Connect (insert-ветка) ставит `status:"connected"` без токенов, хотя сама карточка пишет «becomes Connected only after OAuth». UPDATE-ветка корректно ставит `pending`. **Фикс:** insert со `status:"pending"`.
- **P1 | `analytics/tracker.tsx:86` + `cookie-banner.tsx:18-24`** — Consent Mode default = `granted` (надо `denied` до согласия), а баннер только пишет cookie и НЕ вызывает `gtag('consent','update')` и не гейтит скрипты → GA4+Pixel грузятся и шлют PageView даже при «Essential only». **Фикс:** default `denied` + `update→granted` по «Accept all», гейтить инжект трекеров.
- **P1 | `bookings/booking-widget-editorial.tsx:23,82-83,317-318`** — клиентский «Service fee 6%» (`SERVICE_RATE`), которого сервер не знает → гость видит один тотал до «Reserve» и другой после; в брони этого сбора нет. **Фикс:** убрать фейковый сбор или считать из тех же полей, что сервер.
- **P1 | `app/[locale]/properties/[slug]/page.tsx:498`** — `minNights={1}` захардкожен вместо `min_stay` правила → гость выбирает 1 ночь на min-3, отказ только после submit. **Фикс:** прокинуть реальный `min_stay`.
- **P1 | Home Process/Press/CTA** (`app/[locale]/page.tsx:189`) — вкладки сохраняют `home_process_steps`/`home_press_logos`/`home_cta`, но на публичной главной нет секций → админ редактирует, эффекта ноль. **Фикс:** отрендерить секции (или убрать вкладки).
- **P2 | `payments/payment-settings.tsx:103`** — текст «PayPal … placeholder» устарел: `providers/paypal.ts` — полная реализация, гейт только на env. **Фикс:** «задайте PAYPAL_CLIENT_ID/SECRET».
- **P2 | `payments/actions.ts:280-295` + `booking-manager.tsx`** — staff может записать «оффлайн» платёж под провайдером `stripe/paypal` без `payment_provider_id` → в отчётах выглядит как реальный гейтвей. **Фикс:** ограничить ручную запись `manual`/`crypto`.

### B4. Права (permission mismatch)
- **P1 | `about/page.tsx:27` vs `about|page-intros|legal/actions.ts`** — страница гейтится `organization.view`, но все Save требуют `branding.manage` → видно, но не сохраняется. **Фикс:** гейтить страницу `branding.manage` (как Home).
- **P1 | `crm/actions.ts:131-165` (`unassignLead`)** — обычный агент (`crm.manage`, без `manage_all`) не может снять назначение: RLS WITH CHECK требует `assigned=self OR manage_all`, null не проходит → «You cannot unassign». Кнопка показана всем `canManage`. **Фикс:** гейтить кнопку/действие `manage_all` или ослабить CHECK.
- **P2 | `crm/actions.ts:441-455` (`deleteNote`)** — кнопка Delete показана всем `canManage`, но RLS разрешает удалять только свою заметку или с `manage_all` → чужую удалить нельзя, generic-ошибка. **Фикс:** показывать delete только автору/`manage_all`.
- **P2 | `nav-config.ts:162,164` (Pages, Navigation)** — пункты без `permission`, но редакторы требуют `pages.manage`/`navigation.manage` → viewer видит, но всё падает. **Фикс:** добавить `permission` (как у Home/SEO) + redirect-гейт.

### B5. Логические
- **P1 | `crm/actions.ts:168-268` (`convertLeadToDeal`)** — нет идемпотентности: кнопка «Convert» остаётся после конвертации, повторный клик создаёт второй deal (нет проверки `status==='converted'`, нет unique на `deals.lead_id`). **Фикс:** ранний возврат если уже сконвертирован + скрыть кнопку.
- **P2 | `chat/actions.ts:190-198` (`startConversationWithAgent`)** — переиспользует любой существующий диалог клиента (без фильтра по type/property) → «Message host» по конкретной броне кидает в чужой тред, `propertyId` игнорируется.
- **P2 | `super-admin/queries.ts:490-492`** — health «users total» из непроверенного `data.total` GoTrue listUsers (каст через unknown) → вероятно 0/неверно. **Verify** + считать из members/profiles.
- **P2 | `settings/actions.ts:101` (max 200) vs `auth/schema.ts:28` (max 72)** — bcrypt режет на 72 байта → длинный пароль молча обрезается. **Фикс:** cap 72.

---

## C. Недоработки (incomplete / dead settings)

- **P1 | онлайн-оплата недостижима** — `bookings/booking-widget.tsx` (Stripe/crypto/PayPal redirect) **нигде не импортируется**; публичная страница рендерит только request-only `BookingWidgetEditorial` («Request sent — no charge yet»). Платёжный движок есть, входа с сайта нет. **Фикс:** встроить pay-шаг после создания запроса.
- **P1 | контакты read-only** (`crm/contacts/[id]`) — нет `updateContact`; имя/email/телефон/язык/валюту нельзя поправить (опечатка из лида навсегда). **Фикс:** форма + `updateContact` (RLS `contacts_update` уже разрешает `crm.manage`).
- **P1 | лид назначается только на себя** (`crm/lead-controls` + `actions.ts:93`) — нет реассайна другому агенту. **Фикс:** `reassignLead(leadId, agentId)` под `manage_all` + пикер.
- **P1 | notes/tasks не логируются в `audit_logs`** (`crm/actions.ts:405-579`) — лента Activity не показывает добавление/закрытие заметок и задач. **Фикс:** `logAudit` с entityId связанной сущности.
- **P1 | module-gating отсутствует полностью** (`organization-context.ts:149`, `app-shell.tsx`) — `context.modules` нигде не используется; выключение модуля в Settings ничего не гейтит. **Фикс:** прокинуть `modules` в sidebar + поле в NavItem + гейт страниц/действий.
- **P1 | seo_settings: `robots_txt` и `google_site_verification` — мёртвые поля** (`app/robots.ts` статичный; verification-мета нигде не эмитится). **Фикс:** robots.ts читать из настроек; добавить `verification.google` в metadata.
- **P1 | два CMS-контура не сведены** (`app/[locale]/[...slug]/page.tsx` + `page-renderer.tsx`) — generic `pages` рендерятся в plain Tailwind (не `.editorial`) → тело страницы выглядит «другим продуктом» внутри editorial header/footer. **Фикс:** рендерить PageRenderer в editorial-скоупе/токенах.
- **P1 | `/account` чат = ссылки на legacy** (`account/account-app.tsx:698-756`) — нет встроенной ленты/превью последнего сообщения, только «Open in messages →» в `dashboard`-стиле. **Фикс:** встроить тред или хотя бы snippet+время.
- **P1 | чат не линкуется к лиду/броне** (`chat/actions.ts`) — `lead_id`/`booking_id`/`seller_report_id` колонки есть, не заполняются никогда.
- **P1 | предусловие чата с гостем почти всегда не выполнено** — booking авто-инвайтит гостя как `pending`; пока гость сам не активирует портал, агентство не может написать (`startConversation` → «client has not activated portal»). pending-аккаунты невидимы в форме нового диалога. **Фикс:** разрешить агентству писать pending-клиенту (очередь) и показывать pending.
- **P1 | seo_settings `default_title` фактически мёртв** (`cms/metadata.ts`, `layout.tsx:26` хардкод title). **Фикс:** использовать как фолбэк.
- **P1 | generic CMS pages моноязычны** (`cms/page-actions.ts:32`) — пишется только default-локаль, нет UI для других. (тот же паттерн у home/about/legal/intros — задокументированный лимит, но это пробел для мультиязычного white-label.)
- **P2 | промокоды мёртвые** (`bookings/pricing.ts:151-158` всегда null + виджет шлёт `promoCode:null`) — колонки discount/promo есть, заполнить нечем, нет инпута. (каталог — «demo»; инпут — пробел.)
- **P2 | `.ics` экспортит pending/cleaning/maintenance как «Reserved»** (`api/calendar/properties/[id]/route.ts:55-59`) → over-block по заброшенным заявкам. **Verify**, экспортить только `booked`/`blocked`.
- **P2 | super-admin read-only** — только лицензии; нельзя suspend/reactivate орг, удалить/сменить участника, impersonate. («demo», но «platform management» неполный — добавить хотя бы org-suspend toggle.)
- **P2 | webhook secret rotation мёртв в UI** (`agency-api/webhooks.ts:288-310` есть, но UI только create+delete) + нет edit endpoint.
- **P2 | `sendFileMessage` на ошибке аттача оставляет пустой file-message** (`chat/actions.ts:333-435`) без удаления строки/объекта → пустой пузырь.
- **P2 | document upload `accept` шире серверного MIME** (`extras-manager.tsx:212` gif/svg/avif пройдут клиент, упадут на сервере). **Фикс:** сузить `accept`.
- **P2 | видео/документы без reorder/edit** (только delete), в отличие от фото. Несогласованность после редизайна.
- **P2 | assigned_agent_id / co_agent_ids не редактируются из UI** (`property-form.tsx`) — только статичный label; объект может править лишь создатель или `manage_all`. **Фикс:** пикер агента под `manage_all`.
- **P2 | email-лог статус `queued` — мёртвый** (`recordSend` пишет только sent/failed). **Фикс:** убрать ярлык или реализовать очередь.
- **P2 | conversation_type `internal` — мёртвая фича** (enum есть, staff-to-staff чат не создаётся нигде).

---

## D. Улучшения (P2)

- **Пагинация на leads/contacts** (`crm/leads|contacts/page.tsx`) — сейчас возвращаются ВСЕ строки без `range()`/count (Overview лимитит 5, списки — нет). Bookings уже с пагинацией — взять как эталон.
- **deal-editor валюта — free-text** (`deal-editor.tsx:82`) → можно сохранить «abc», на борде покажется default. **Фикс:** `<select>` по `isCurrencyCode`.
- **Лиды-источники (taxonomy drift)** (`crm/lead-actions.ts` vs seed) — фильтр/breakdown показывает источники, которых intake никогда не пишет. Выровнять `mapLeadKind` со seeded `lead_sources`.
- **Реалтайм-чат тяжёлый** (`chat-thread.tsx:160`) — на каждый INSERT полный `router.refresh()` + переподпись всех signed-URL. **Фикс:** дописывать сообщение из payload/дебаунс. Плюс realtime-ошибки молча глотаются (нет fallback-polling).
- **Signed-URL аттачей TTL 1ч** (`chat/queries.ts:170`) → в долгих тредах ломаются. Освежать клиентом или поднять TTL.
- **TZ-рассинхрон**: брони/задачи местами считают «сегодня» в UTC, местами в локали (`bookings/queries.ts:306`, `task-manager.tsx:64`, кампании `datetime-local` наивный → cron сравнивает с UTC). Единый источник TZ (`rental_calendars.timezone` уже есть, не используется).
- **CSV-импорт контактов**: sequential, без лимита строк/preview/per-row reasons (`contacts-import-actions.ts`), молчаливый skip. **Фикс:** лимит, batch-upsert, причины.
- **Settings → Team**: N admin-вызовов `getUserById` на участника (`settings/page.tsx:55`) — заменить одним `listUsers`.
- **Колокол**: «непрочитано» — один localStorage-таймстемп на браузер; нет server `read_at`.
- **SEO-редактор**: нет превью `<title>`/OG-карточки и подсказки verified-домена.
- **Deal-board**: `moveDeal`/`updateDeal` игнорируют `result.ok` — упавший move молча откатывается без ошибки.
- **Свежесть слага**: `randomSlugSuffix` на `Math.random` (низкая энтропия, generic-ошибка при коллизии) → `crypto.randomUUID().slice(0,6)`.
- **Навигационный guard на грязной форме** редактора объекта (Back to list молча теряет правки).
- **Гонки read-then-write**: rate-limit (`agency-api/auth.ts:166`) и webhook-retry batch (`webhooks.ts:61`) — атомарный RPC / `FOR UPDATE SKIP LOCKED`.

---

## E. Стратегические идеи «что добавить» (сверх багов)

- **Глобальный поиск / command palette** (Cmd-K) в топбаре по объектам/лидам/броням.
- **Единый тост-фидбэк** вместо смеси inline-сообщений (Profile «saved», лиды, чат — сейчас разнобой).
- **Bulk-действия** на таблицах (мультивыбор: статус/назначение/удаление).
- **Сохранённые пресеты фильтров** на тяжёлых списках (bookings, leads).
- **Range-дат и кастомизация на Overview** + мини-лента активности.
- **CSV-экспорт** на большем числе списков (leads, bookings, contacts).
- **Оптимистичный UI** для чата/заметок/задач.
- **Тёмная тема админки** (токены `.dark` уже частично есть — докрутить под `.dashboard`).
- **Onboarding-чеклист** на пустой орг (первый объект, первый домен, branding) с CTA в EmptyState.

---

## F. Проверено — работает (НЕ трогать как «баг»)
- `z.guid()` используется везде — **`z.uuid()` не осталось нигде** (тот P0-класс закрыт).
- `buffer_days` **применяется** при бронировании (`rental-calendar/queries.ts:230-233`) — старый ADMIN_AUDIT.md устарел.
- Дубай-числа (DLD/agency/registration) **полностью редактируемы** через `brand_settings`, читаются на property-странице.
- Серверный PDF-инвойс работает, permission-gated; WinAnsi-санитайз имён.
- Auth (sign-in/up/reset, open-redirect guard, idempotent org-bootstrap), лицензии (server-key, requireSuperAdmin, audit) — корректны.
- Stripe/PayPal/crypto-адаптеры — реальные реализации, гейт на env (demo).
- Редизайн + перенос Videos/Documents→Media, Nearby places→Location — **проверено, без регрессий** (single-fetch, типы через `React.ComponentProps`, нет двойной загрузки, sticky-бар не перекрывает).
- Agency API (ключи sha256, JSON/XML/CSV фиды, HMAC-подпись, виджет), сегменты+авто-рефреш, отписка, шаблоны писем — реализованы.
- CSV-парсер контактов корректно обрабатывает кавычки/CRLF; поиск чистит `,()` от PostgREST-инъекций.

---

## Рекомендуемый порядок фиксов
1. **Быстрые P1, без миграций (полдня):** integrations false-Connected · about-permission · unassignLead-гейт · convertLeadToDeal идемпотентность · колокол/unread утечки · minNights · service-fee · misleading cron-копирайт · pages/navigation nav-permission · password cap 72.
2. **Consent/GDPR** (tracker default `denied` + баннер→consent update + гейт скриптов).
3. **mixed rent→sale** фикс + payment-webhook идемпотентность (200 на дубль).
4. **Овербукинг-констрейнт** (миграция btree_gist EXCLUDE) — самый весомый по данным.
5. **Недоработки-фичи:** updateContact · reassignLead · notes/tasks audit · module-gating · seo robots/verification · Home Process/Press/CTA рендер.
6. **P2/улучшения** — по приоритету покупателя.
