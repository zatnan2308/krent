# 🔧 Audit Fixes — хэндофф для нового чата (Krent)

> Контекст-память предыдущего чата закончилась. Этот файл — полный контекст,
> чтобы СРАЗУ продолжить починку по `docs/ADMIN_AUDIT_2.md`. Отвечай по-русски.
> Источник истины по находкам (баги/недоработки/улучшения с `file:line`) —
> **`docs/ADMIN_AUDIT_2.md`**. Здесь — что уже сделано, что осталось, в каком
> порядке, и как.

---

## 0. РЕЖИМ РАБОТЫ (как договорились с пользователем)
- **Непрерывно**: фикс → проверка → commit+push, после КАЖДОГО логического пункта.
  Не останавливаться и не спрашивать (пользователь явно велел идти подряд).
- **Проверка перед каждым коммитом** — все три зелёные:
  `npm run typecheck` · `npm run lint` · `npm run build` (билд ~75–90с).
- **Пушим прямо в `main`** (автодеплой Vercel). Близкие мелкие фиксы группируем
  в один тематический коммит, чтобы не гонять билд по 30 раз.
- **КРОН НЕ ТРОГАЕМ** — тестовый сайт, нет Vercel Pro. Любые «cron не запускается»
  пункты из аудита **пропускаем** (только вводящие в заблуждение тексты про
  «автоматический синк» можно честно поправлять — это не про запуск крона).
- **Скоуп задачи:** делаем разделы **B, C, D** аудита (баги, недоработки,
  улучшения). Раздел **E «Стратегические идеи»** — граница/опционал в конце.
- Коммиты заканчиваются строкой:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`
- ⚠️ PowerShell here-string ломается на `&` в теле сообщения коммита — используй
  несколько `-m "..."` флагов (без `&`), либо git commit обычным образом.
  Пример рабочего паттерна:
  `git add -A; git commit -m "subject" -m "body" -m "Co-Authored-By: ..."; if ($?) { git push origin main }`

---

## 1. ГРАБЛИ И КОНВЕНЦИИ (важно, выстрадано)
- **zod v4: `z.uuid()` СТРОГИЙ** (отвергает «красивые» демо-UUID). Для id —
  **`z.guid()`**. По всему репо уже `z.guid()` — НЕ ломай это в новых схемах.
- **Supabase MCP-миграции** идут с пустым `search_path` → схема-квалифицируй всё
  (`public.<table>`, `extensions.<...>`). RLS-хелперы в схеме `app_private`.
  Проект Supabase: **`pclhwbgsxdztriqdtosg`**. После apply_migration —
  создать локальный файл `supabase/migrations/YYYYMMDDHHMMSS_name.sql`
  (следующий timestamp после `20260605120000_*`) и при изменении КОЛОНОК вручную
  обновить `src/types/database.ts` (констрейнты типов НЕ меняют).
- **Демо для продажи.** Фичи на внешних ключах покупателя (real OAuth интеграций,
  live-синк GSC/Google/Meta Ads, Meta CAPI) — ожидаемые заглушки, НЕ баги.
  Но вводящий в заблуждение UI (фейковый «Connected», «Schedule», который молча
  не шлёт) — чинить/честно подписывать.
- **Публичный editorial-сайт `[locale]/*`** — любимый, ОСТОРОЖНО. Дизайн-токены
  под `.editorial` (золото `--accent` #8B7340, serif, eyebrow). Админка —
  отдельный scope `.dashboard` (НЕ трогать `:root`).
- Server actions возвращают `{ ok: true } | { ok: false; error: string }`.
- `createClient()` (RLS, user) vs `createAdminClient()` (service role, мимо RLS).
- Windows, PowerShell дефолт. «LF will be replaced by CRLF» при коммите —
  безвредно.

---

## 2. ✅ УЖЕ СДЕЛАНО ЭТОЙ СЕССИЕЙ (НЕ переделывать!)

### Редизайн UI/UX админки (раньше) — трекер `docs/ADMIN_UX_REDESIGN.md`
Все 8 секций сайдбара + super-admin на единых `PageHeader`/`StatCard`/тулбарах/
подчёркнутых под-навигациях + моторика. Перенос Videos/Documents→вкладка Media,
Nearby places→Location в редакторе объекта. Двухколоночный Rental calendar.
Коммиты `ee2342c..91c21f8`, `32d58e3`.

### Аудит-фиксы (раздел «Рекомендуемый порядок» из ADMIN_AUDIT_2.md):
| Коммит | Что закрыто |
|---|---|
| `cbef9bc` | сам аудит-документ `docs/ADMIN_AUDIT_2.md` |
| `a6e6f47` | **Приватность**: колокол (`queries-bell` фильтр по `recipient_user_id`) + бейдж непрочитанных (`unread-queries` join `chat_participants`) — только своё; integrations ручной Connect → `status:"pending"` (был фейковый «connected») |
| `adfb822` | **Права**: About-страница+nav → `branding.manage` (совпало видимость/редактируемость); Pages/Navigation — redirect-гейты + nav-permission (`pages.manage`/`navigation.manage`) |
| `ecb5a55` | **CRM**: `unassignLead` требует `crm.manage_all` (+кнопка прячется); `convertLeadToDeal` идемпотентен (нет дублей сделок); `deleteNote` ловит RLS-блок (0 строк) с понятной ошибкой |
| `e6601a7` | **Booking**: убран фейковый клиентский service-fee 6%; реальный `min_stay` через новый `getPropertyMinStay` (был хардкод 1); честный текст синка в Rentals |
| `8d1104f` | **GDPR**: GA4/GTM/Pixel грузятся только после «Accept all» (cookie-banner шлёт событие `krent-consent`, tracker слушает); Consent Mode default `denied`; password cap 72 (settings) |
| `4bae441` | **mixed rent→sale** больше не портится при перезагрузке редактора (getPropertyForEdit раскладывает по периоду в зависимости от purpose); **payment-webhook идемпотентность** (ранний 200 при повторной доставке) |
| `71e947c` | **ОВЕРБУКИНГ**: gist-EXCLUDE на пересечение ПРЯМЫХ броней (status booked/pending, import_source_id IS NULL) — миграция `20260605120000_rental_events_no_direct_overlap.sql`, применена в Supabase. iCal-блоки/ручные блокировки НЕ затронуты. requestBooking уже ловит exclusion_violation → «These dates are no longer available» |
| `cb87fa5` | **CRM Activity**: createNote/deleteNote/createTask/setTaskStatus/deleteTask пишут в `audit_logs` на таймлайн связанной сущности (entity_id = lead/contact/deal) + ярлыки в `activity-timeline` |
| `90e0966` | **SEO**: `[locale]/layout` generateMetadata эмитит `verification.google`; `robots.ts` → route-handler `robots.txt/route.ts` отдаёт кастомный `seo_settings.robots_txt` |
| `507ddf8` | **CRM фичи**: `updateContact` + инлайн-редактор `contact-edit-form.tsx` (контакты были read-only); `reassignLead` (gated `manage_all`) + селект агента в `LeadControls` (был только self-assign) |
| `5a10829` | **Module-gating**: сайдбар прячет пункт, если его модуль выключен в Settings (карта `MODULE_BY_HREF` в `app-sidebar.tsx`; `context.modules` уже фильтрует `enabled=true`; modules проброшен через DashboardLayout→AppShell→AppSidebar) |

**Закрыты пункты «Рекомендуемого порядка» 1–4 ПОЛНОСТЬЮ и большая часть 5.**

### ⚠️ Что НЕ надо «чинить» — проверено, работает:
- `z.guid()` везде (UUID-класс закрыт). `buffer_days` применяется.
- `context.modules` уже фильтрует `enabled=true` (organization-context.ts:145).
- Дубай-числа (DLD/agency/registration) редактируемы через `brand_settings`.
- Овербукинг-констрейнт УЖЕ применён (не применять повторно).
- PDF-инвойс, auth, лицензии — корректны.

---

## 3. ⏳ ЧТО ОСТАЛОСЬ — В ПОРЯДКЕ ПРИОРИТЕТА

### 3.0. 🟢 IN-FLIGHT: deal-editor валюта → select (НАЧАТЬ С ЭТОГО)
Я дочитал `src/features/crm/deal-editor.tsx`. Сейчас валюта — free-text Input
(можно сохранить «abc», на борде покажется default — рассинхрон). Готовая правка:

**Edit 1** — добавить импорт после строки `import { Input } from "@/components/ui/input";`:
```ts
import { CURRENCIES } from "@/lib/currency/config";
```
**Edit 2** — заменить блок Currency (≈ строки 80–86):
```tsx
        <label className="block space-y-1">
          <span className="text-sm font-medium">Currency</span>
          <Input
            value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value })}
          />
        </label>
```
на:
```tsx
        <label className="block space-y-1">
          <span className="text-sm font-medium">Currency</span>
          <select
            className={FIELD_CLASS}
            value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value })}
          >
            {CURRENCIES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </label>
```
`FIELD_CLASS` уже есть в файле. `CURRENCIES` — массив кодов из `@/lib/currency/config`
(используется так же в `property-form.tsx`). Можно сгруппировать в один коммит с
другими мелкими P2.

### 3.1. P2-улучшения (раздел D аудита) — чистые, контейнерные
Делать пачками по теме (1 билд на пачку). По убыванию ценности:

1. **Пагинация на leads и contacts** (нет `range()`, грузят все строки).
   Эталон — `src/app/(dashboard)/dashboard/bookings/page.tsx`: `listBookings`
   возвращает `{ items, total, pageSize }`, страница рендерит `<Pagination>` +
   `buildPageHref` (сохраняет фильтры). Применить к:
   - `src/features/crm/queries.ts` → `listLeads`/`listContacts`: добавить `page`,
     `.range()`, count `{ count: "exact" }`, вернуть `{ items, total, pageSize }`.
   - `crm/leads/page.tsx` (фильтры status/type/source) и `crm/contacts/page.tsx`
     (q) — рендер `Pagination` + строка «N total · page X of Y».
2. **deal-board глотает result.ok** (`src/features/crm/deal-board.tsx` `handleMove`):
   `await moveDeal(...)` → `router.refresh()` без проверки → упавший move молча
   откатывается. Показать `result.error` (как в LeadControls/DealEditor).
3. **Settings Team N+1** (`settings/page.tsx:55`): один
   `admin.auth.admin.getUserById` на участника в Promise.all. Заменить одним
   `admin.auth.admin.listUsers` + map (паттерн в `src/server/user-directory.ts`).
4. **Lead-source taxonomy drift** (`src/features/crm/lead-actions.ts` `mapLeadKind`
   vs seeded `lead_sources`): фильтр/breakdown показывает источники, которых
   intake никогда не пишет. Выровнять выходы `mapLeadKind` со seeded ключами
   (website/booking/referral/phone/manual) или убрать неиспользуемые из seed/UI.
5. **slug entropy** (`properties/actions.ts` `randomSlugSuffix` на `Math.random`):
   → `crypto.randomUUID().slice(0,6)`; на коллизии 23505 показать явную ошибку
   (как `updateProperty`).
6. **document upload accept** (`extras-manager.tsx:212`): `accept` шире серверного
   MIME (gif/svg/avif пройдут клиент, упадут на сервере) — сузить до
   pdf/jpeg/png/webp/doc/docx.
7. **email-log `queued` — мёртвый статус** (`recordSend` пишет только sent/failed):
   убрать ярлык `queued` из `EMAIL_SEND_STATUS_LABELS`/badge map (`email/page.tsx`).
8. **Refund cap по прошлым рефандам** (`payments/actions.ts:344` `issueRefund`):
   валидирует только против суммы последнего платежа — два частичных могут
   превысить captured. Cap по `amount − sum(succeeded refunds)`.
9. **NearbyPlaces unit-селектор** (`extras-manager.tsx`): хардкод `km` → km/mi select.
10. **bell read-state** (`notifications-bell.tsx`): один localStorage-таймстемп на
    браузер; можно серверный `read_at` (опц.).
11. **TZ-рассинхрон** (опц.): `bookings/queries.ts:306` `todayIso` UTC vs виджет
    local; `task-manager.tsx:64`; кампании `datetime-local` наивный vs cron UTC.
    Единый источник TZ (`rental_calendars.timezone` уже есть, не используется).
12. **Realtime-чат тяжёлый** (`chat-thread.tsx:160`): full `router.refresh()` на
    каждый INSERT + переподпись signed-URL; молчаливый catch без fallback-polling.
    Дописывать сообщение из payload/дебаунс. (Среднее.)
13. **CSV-импорт контактов**: sequential, без лимита/preview/per-row reasons
    (`contacts-import-actions.ts`). Лимит ~1000 + batch-upsert. (Среднее.)
14. **read-then-write races** (низкий приоритет): rate-limit `agency-api/auth.ts:166`,
    webhook-retry batch `webhooks.ts:61` — атомарный RPC / `FOR UPDATE SKIP LOCKED`.
15. **SEO-превью** (`seo-settings-form.tsx`): нет превью `<title>`/OG-карточки (опц.).
16. **Транзакционность** (опц., нужны RPC): цены `delete-then-insert`
    (`properties/actions.ts:230`), iCal-импорт delete-then-insert
    (`rental-calendar/sync.ts:72`) — обернуть в транзакцию/upsert.

### 3.2. Недоработки раздела C — крупнее/важно (после P2)
- **🟡 Home Process/Press/CTA рендер на публичной главной** (P1, РИСКОВО — editorial!):
  `src/features/home/home-editor.tsx` сохраняет вкладки Process/Press/CTA
  (`saveProcessStep`/`savePressLogo`/`saveCta`), `getHomeContent` грузит
  (`content.process`/`content.press`/`content.cta`), НО `src/app/[locale]/page.tsx`
  их не рендерит → админ редактирует, эффекта ноль. Добавить 3 editorial-секции
  в `page.tsx`, СТРОГО в стиле существующих (hero/stats/communities — смотри как
  они там сделаны: eyebrow, serif, `var(--accent)`, `.ed-container`). Сверить
  формы данных в `getHomeContent` (src/features/home/queries.ts). Делать ОСТОРОЖНО,
  желательно с визуальной проверкой; если сомнения — минимальный CTA-блок сначала.
- **`/account` чат = ссылки на legacy** (`account/account-app.tsx:698`): встроить
  ленту/превью последнего сообщения вместо «Open in messages →».
- **Чат не линкуется к лиду/броне** (`chat/actions.ts`): `lead_id`/`booking_id`
  колонки есть, не заполняются. Прокинуть при создании диалога.
- **Онлайн-оплата с сайта недостижима** (`bookings/booking-widget.tsx` нигде не
  импортируется; рендерится только request-only `booking-widget-editorial`).
  Встроить pay-шаг после создания запроса. (Платёжный движок есть.)
- **assigned_agent_id / co_agent_ids из UI не правятся** (`property-form.tsx`):
  добавить пикер агента под `properties.manage_all`.
- **videos/documents без reorder/edit** (только delete) — в отличие от фото.
- **super-admin read-only** (кроме лицензий): добавить хотя бы org suspend toggle.
- **webhook secret rotation мёртв в UI** (`agency-api/webhooks.ts:288` есть, UI нет).
- **`sendFileMessage` оставляет пустой file-message** при ошибке аттача
  (`chat/actions.ts:333`): удалять строку+объект.
- **seo `default_title` фактически мёртв** (опц.): использовать как фолбэк title.
- **два CMS-контура / generic pages моноязычны / промокоды** — крупно, к концу.

### 3.3. Раздел E «Стратегические идеи» (граница скоупа, опционал)
Command-palette (Cmd-K), единый тост-фидбэк, bulk-действия на таблицах,
сохранённые пресеты фильтров, range-дат на Overview, CSV-экспорт, оптимистичный
UI, тёмная тема админки, onboarding-чеклист. — Делать ТОЛЬКО если всё выше закрыто.

---

## 4. ИНФРА И ID
- GitHub `https://github.com/zatnan2308/krent.git`, ветка `main`, автодеплой Vercel.
- Supabase MCP доступен: `execute_sql`, `apply_migration`, `list_extensions`,
  `list_migrations` (загрузить через ToolSearch: `select:mcp__fd0ebc18-...__execute_sql,...`).
  project_id = `pclhwbgsxdztriqdtosg`. Демо-орг id = `11111111-1111-1111-1111-111111111111`
  (все 19 модулей enabled).
- Последняя локальная миграция: `supabase/migrations/20260605120000_rental_events_no_direct_overlap.sql`.

## 5. С ЧЕГО НАЧАТЬ В НОВОМ ЧАТЕ
1. Прочитать этот файл + `docs/ADMIN_AUDIT_2.md` (полные находки с file:line).
2. Применить готовую правку **3.0 (deal-editor валюта-select)**.
3. Идти по **3.1 (P2)** пачками: фикс → typecheck/lint/build → commit+push.
4. Затем **3.2** (Home Process/Press/CTA — осторожно), потом остальное C.
5. Раздел E — в самом конце/опционально.
6. Кроны не трогаем. После каждой пачки — обновлять чекбоксы прогресса здесь
   или в ADMIN_AUDIT_2.md.
