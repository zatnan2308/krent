# 🚀 START HERE — Хэндофф для новой сессии (Krent)

> Этот файл — полный контекст для продолжения работы в новом заходе. Прочитай
> целиком, затем **`docs/ADMIN_AUDIT.md`** (главный трекер прогресса). Отвечай
> по-русски. Текущий `main` HEAD на момент написания: **`cacdca2`**.

---

## 0. ГЛАВНОЕ ЗА 30 СЕКУНД

- **Krent** — white-label SaaS для риелторов/агентств недвижимости (Дубай-дизайн):
  публичный сайт + большая админка. Мультитенант (организация резолвится по домену).
- **Это ДЕМО для продажи.** Покупатель потом подключит **свои** Vercel/GitHub/Supabase.
  Полностью «боевым» этот инстанс не станет. **НО задача — чтобы КАЖДАЯ кнопка и
  функция в админке и на сайте реально работали** (на демо-данных).
- **Текущая методология:** прокликивать каждую кнопку/функцию, ловить баги, чинить.
  Пользователь кидает скриншоты багов — разбираем и фиксим по одному.
- Стек: **Next.js 14.2.35** (App Router) · React · TS · **Supabase** (Postgres+Auth+
  Storage+RLS) · **zod v4** · Tailwind + shadcn · Resend (email) · pdf-lib (инвойсы) ·
  деплой на **Vercel** (Hobby).

---

## 1. ⚠️ КРИТИЧЕСКИЕ ГРАБЛИ (читать обязательно — это всё выстрадано)

### 1.1. zod v4 `z.uuid()` СТРОГИЙ по RFC → используй `z.guid()`
- zod v4 `z.uuid()` проверяет RFC-биты версии (1–8) и варианта (8–b).
- **Демо-данные засеяны «красивыми» не-RFC UUID**, напр. объекты:
  `aaaaaaaa-0000-0000-0000-000000000001 … 005` (версия `0`, вариант `0`).
- Postgres хранит их как валидный `uuid`, но `z.uuid()` их **отвергает**
  («Invalid UUID») → ломало кучу admin-действий (календарь, CRM, бронирования…).
- **Уже исправлено:** все 83 `z.uuid()` → `z.guid()` (нестрогий, любой `8-4-4-4-12`
  hex) — коммит `cacdca2`. **В новых схемах для id используй `z.guid()`, НЕ `z.uuid()`.**
- 🔎 Это ЭТАЛОННЫЙ класс бага демо-данных. Если кнопка валит «Invalid …» — почти
  всегда дело в id/валидации. Воспроизводи схему через `npx tsx` с реальным демо-id.

### 1.2. Supabase-миграции через MCP — схема-квалифицируй ВСЁ
- MCP `apply_migration` исполняется с **пустым `search_path`** → ссылайся
  полным именем: `public.<table>`, `auth.users`, `public.set_updated_at()`.
- **RLS-хелперы лежат в схеме `app_private`, НЕ в `public`**:
  `app_private.is_org_member(org_id)`, `app_private.has_permission(org_id, 'perm.key')`.
  (Старые файлы миграций в репо вызывают их без схемы — это вводит в заблуждение,
  под пустым search_path так не сработает.)
- Проект Supabase: **`pclhwbgsxdztriqdtosg`** (имя «Krent», регион eu-west-1).
- После миграции: (1) создай локальный файл
  `supabase/migrations/YYYYMMDDHHMMSS_name.sql` (следующий timestamp после последнего),
  (2) **вручную** обнови `src/types/database.ts` (Row/Insert/Update, колонки по алфавиту) —
  типы НЕ авто-генерятся. См. также `docs/ADMIN_AUDIT.md` и память
  `reference-supabase-migration-gotchas`.

### 1.3. Vercel Hobby — кроны только раз в сутки → вынесены в GitHub Actions
- На **Hobby** cron-jobs разрешены ≤1 раз/день и ≤2 шт. Частые кроны в `vercel.json`
  → **КАЖДАЯ сборка падает** («This cron expression would run more than once per day»).
  Именно из-за этого прод однажды отстал на 63 коммита (см. §5).
- **`crons` убраны из `vercel.json`.** 4 cron-эндпоинта теперь дёргает бесплатный
  GitHub Actions workflow:
  | endpoint | частота |
  |---|---|
  | `/api/cron/calendar-sync` | ежечасно |
  | `/api/cron/webhooks-retry` | каждые 5 мин |
  | `/api/cron/campaigns-dispatch` | каждые 10 мин |
  | `/api/cron/task-reminders` | раз в день 09:00 UTC |
- ⚠️ **Файл `.github/workflows/cron.yml` ЕЩЁ НЕ в репо** — его должен добавить
  пользователь через **веб-интерфейс GitHub** (см. §6), потому что:

### 1.4. Git-токен БЕЗ scope `workflow`
- Используемый PAT не имеет права `workflow` → **любой пуш, трогающий
  `.github/workflows/`, отклоняется** («refusing to allow a Personal Access Token…»).
- Поэтому: не коммить файлы в `.github/workflows/` через git — пользователь
  добавляет их веб-интерфейсом. `gh` и `vercel` CLI-токены **тоже протухли** (invalid).

### 1.5. `CRON_SECRET` нужен в ДВУХ местах
- Cron-роуты принимают только `GET` с `Authorization: Bearer ${CRON_SECRET}` (иначе 401).
- Значение должно совпадать: **GitHub Actions secret** `CRON_SECRET` + **Vercel env**
  `CRON_SECRET` (Production). Сейчас, скорее всего, **не задан** → кроны неактивны.

### 1.6. Прочее окружение
- **Foreground `sleep` ЗАБЛОКИРОВАН** в Bash И PowerShell. Чтобы подождать
  (напр. сборку Vercel) — `run_in_background: true` с polling-циклом и `sleep`
  внутри, либо Monitor-tool. Пример polling в §5.
- Windows. Дефолтный шелл PowerShell, но Bash тоже есть. Предупреждения
  «LF will be replaced by CRLF» при коммите — **безвредны**.
- Vercel MCP-коннектор подключён (читает проекты/деплои/логи), **но сам деплой не
  создаёт** — `deploy_to_vercel` лишь выдаёт инструкции; деплой идёт через `git push`.

---

## 2. ИНФРАСТРУКТУРА И ID

| Что | Значение |
|---|---|
| **GitHub** | `https://github.com/zatnan2308/krent.git`, default+production branch `main` |
| **Vercel team** | `team_HrNq1BJcoS4RPaAawyB1syDU` (slug `zatnan2308-7469s-projects`) |
| **Vercel project** | `krent` = `prj_HqPxbSipwkPaf4Yv6KOA97iQRKve`, план **Hobby** |
| **Prod domain** | `project-4tw1p.vercel.app` (+ алиасы `krent-*.vercel.app`) |
| **Vercel region** | `dub1` (Dublin) — зафиксирован в `vercel.json` (рядом с Supabase) |
| **Node на Vercel** | 24.x |
| **Supabase project** | `pclhwbgsxdztriqdtosg` (имя «Krent», eu-west-1) |
| **Автодеплой** | GitHub→Vercel РАБОТАЕТ (после фикса кронов): push в `main` → деплой |

Доступ к Supabase — через MCP (`apply_migration`, `execute_sql`, `list_tables`,
`get_advisors`, `list_migrations`, …). Доступ к Vercel — через MCP
(`list_deployments`, `get_deployment_build_logs`, `get_project`, `get_runtime_logs`).
Email — Resend. Storage bucket для медиа/документов объектов — `property-media`
(публичный, загрузка сервис-клиентом — на bucket нет storage-политик).

---

## 3. КОНВЕНЦИИ РАБОТЫ (как тут принято)

1. **Проверки перед коммитом** — все три зелёные:
   `npm run typecheck` · `npm run lint` · `npm run build`.
2. **Коммиты атомарные**, conventional (`feat/fix/docs/chore(scope): …`),
   заканчиваются строкой:
   `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
3. **Пушим прямо в `main`** (так заведено — вся работа идёт в main и автодеплоится).
4. После каждого пункта обновляем **`docs/ADMIN_AUDIT.md`** (прогресс с хэшами).
5. Миграции — через Supabase MCP + локальный файл + типы вручную (см. §1.2).
6. Воспроизведение баг-схем — `npx tsx` (есть): пишем временный `.mjs`,
   импортируем схему/функцию из `./src/...`, запускаем, удаляем.
7. Reuse-first: смотри, как сделано рядом (паттерны поиска/пагинации, аплоада,
   server-actions), и зеркаль 1-в-1.

### Ключевые паттерны кода
- Server actions возвращают `{ ok: true } | { ok: false; error: string }`.
- `requireOrganizationContext()` → контекст (организация + права); редиректит на
  sign-in если не залогинен. `hasPermission(context, "key")` — RBAC.
- `createClient()` (RLS, user) vs `createAdminClient()` (service role, мимо RLS —
  для кросс-тенант/публичных чтений и привилегированных записей).
- zod-схемы валидируют вход server actions (для id — **`z.guid()`**).

---

## 4. АРХИТЕКТУРА / КАРТА КОДА

```
src/app/(dashboard)/dashboard/*   — страницы админки
src/app/[locale]/*                — публичный сайт (editorial-дизайн, Дубай;
                                    кастомные inline-style компоненты + shadcn)
src/app/api/*                     — API (cron, email/webhook/resend, calendar .ics,
                                    public/v1 agency API)
src/features/*                    — модули: bookings, rental-calendar, crm, campaigns,
                                    properties, agents, cms, chat, payments,
                                    integrations, analytics, settings, portal, home,
                                    about, seo, notifications, agency-api, marketing
src/server/*                      — organization-context (RBAC, cache), permissions,
                                    auth, audit (logAudit), user-directory, public-site
src/lib/*                         — supabase/server (clients), i18n, currency,
                                    constants/routes, branding
src/types/database.ts             — РУЧНЫЕ типы Supabase (обновлять при миграциях)
supabase/migrations/*             — SQL-миграции (последняя ~20260604220000)
docs/ADMIN_AUDIT.md               — ⭐ ГЛАВНЫЙ ТРЕКЕР аудита/прогресса
docs/setup/deployment-vercel.md   — деплой + кроны через GitHub Actions
docs/HANDOFF.md                   — старый общий хэндофф (паттерны §6 и т.д.)
```

Память проекта (если новый заход на этой же машине — подгружается сама):
`C:\Users\Admin\.claude\projects\D--krent\memory\` — особенно
`project_state_full.md`, `reference_supabase_migration_gotchas.md`, `feedback_workflow.md`.

---

## 5. ЭПОПЕЯ С ДЕПЛОЕМ (чтобы не наступить снова)

**Симптом:** `/dashboard/rentals` отдавал 404 на проде (а локально и в коде всё ок).

**Диагноз (по шагам):**
1. Код корректен и в `main` — пуши доходили до GitHub.
2. Vercel застрял на старом коммите `32d115c`, отставал на **63 коммита**.
3. Автодеплой казался «мёртвым», НО GitHub commit-status показал
   `Vercel: failure — "Deployment failed"` → автодеплой РАБОТАЛ, но **сборка падала**.
4. Причина падения (нашёл пользователь по ссылке из статуса): **Hobby + частые
   кроны в `vercel.json`** (см. §1.3).

**Фикс:** убрал `crons` из `vercel.json` → сборка прошла за ~1.5 мин → прод
догнал `main`, 404 ушёл, автодеплой подтверждённо работает.

**Полезный приём — дождаться сборки (sleep заблокирован, поэтому фон):**
```bash
# run_in_background: true
for i in $(seq 1 40); do
  state=$(curl -s "https://api.github.com/repos/zatnan2308/krent/commits/<SHA>/status" \
    | grep -m1 '"state"' | sed -E 's/.*"state":[[:space:]]*"([^"]+)".*/\1/')
  echo "[$i] $(date +%H:%M:%S) state=$state"
  [ "$state" = "success" ] || [ "$state" = "failure" ] && break
  sleep 15
done
echo "FINAL: $state"
```
(commit-status overall `state`: pending → success/failure. `list_deployments` MCP
НЕ показывает упавшие деплои — не вводись в заблуждение «деплоев нет».)

---

## 6. ОТКРЫТЫЕ TODO ДЛЯ ПОЛЬЗОВАТЕЛЯ/ПОКУПАТЕЛЯ (инфра, не код)

1. **Добавить `.github/workflows/cron.yml` через веб-GitHub** (git-токен без scope
   `workflow`). Контент — в `docs/setup/deployment-vercel.md` §4 (или в истории чата).
   Маппит расписания на cron-эндпоинты через `github.event.schedule`,
   `env.BASE_URL = https://project-4tw1p.vercel.app`.
2. **Задать `CRON_SECRET`** одинаковым значением: GitHub Actions secret + Vercel env
   (Production). Иначе cron-роуты = 401.
3. **Заполнить env на Vercel** по `docs/setup/environment-variables.md`
   (`SUPABASE_*`, `RESEND_*`, `NEXT_PUBLIC_*`, `CRON_SECRET`, и т.д.).
4. **Resend:** включить open/click tracking + вебхук `…/api/email/webhook/resend`
   (иначе метрики кампаний Delivered/Opened/Clicked = 0; код готов).
5. (Опц.) **Vercel Pro** — если хочется нативные Vercel-кроны вместо GitHub Actions.
6. Регион `dub1` уже в `vercel.json` — отдельно настраивать не нужно.

---

## 7. ЧТО СДЕЛАНО (эта + прошлые сессии)

**Источник истины — `docs/ADMIN_AUDIT.md`.** Кратко:
- **P0 — 5/5** закрыты.
- **P1 — всё, кроме `P1-13`** (мультиязычный редактор объекта — его делает САМ
  владелец, своя структура `property_translations` — НЕ трогать).
- **P2 — почти всё.**

Фичи этой сессии (хэши в ADMIN_AUDIT.md): bookings поиск/фильтр/пагинация/диапазон;
редактируемые колонки футера + header-tagline + строка языков/валют (white-label);
CRM activity timeline + логирование мутаций; активация `lead_sources` + аналитика;
профиль агента (`agent_profiles`) + редактор + «Listed by»; open/click email-трекинг
(Resend webhooks); авто-рефреш сегментов рассылки; превью кастомных CMS-страниц;
**множественные цены** (sale+rent для mixed); **дропдауны навигации** (parent_id) +
`page_id`; **серверный PDF-инвойс** (pdf-lib); **загрузка документов в Storage**;
правка доков деплоя; **фикс UUID-валидации** (`z.uuid → z.guid`).

---

## 8. ЧТО ОСТАЛОСЬ / ЖДЁТ ВИЗУАЛЬНОЙ ПРОВЕРКИ

### ⏳ Сделано, но НЕ проверено глазами (собирается/собрано, билд зелёный)
- **Множественные цены** (mixed sale+rent): форма объекта (вкладка Pricing) +
  карточка/деталь + booking.
- **Дропдауны навигации**: создать пункт с Parent в `/dashboard/navigation` →
  hover-дропдаун в шапке (главная-hero + внутренние) + моб-меню.
- **Загрузка документов**: вкладка документов объекта → Upload файла.
- **Фикс календарного блока** (UUID) — последний пуш `cacdca2`, проверить «Create block».

### 🔲 Осталось (требует пользователя/ключей — НЕ делать вслепую)
- `P1-13` мультиязык объекта — делает владелец.
- **Карта в локации объекта** — Leaflet/OSM без ключа возможно, но виджет в форме
  (asset/CSS/SSR-грабли) почти наверняка сломается вслепую → нужна визуальная проверка.
  (ввод lat/lng руками уже работает.)
- **`syncReports`** (GSC/Google Ads/Meta) + **Meta CAPI** — нужны внешние ключи/токены.
- **Видео объекта в Storage** — большие файлы не лезут в лимит upload server actions
  (документы — уже грузятся; видео остаётся по URL).
- Свести два CMS-контура (крупно, пересекается с P1-13).

### 🎯 ОСНОВНАЯ ТЕКУЩАЯ ЗАДАЧА
**«Прокликать каждую кнопку и функцию — в админке и на сайте — и сделать рабочей»**
(демо для продажи). Пользователь шлёт скриншоты багов. Методика на примере UUID-бага:
воспроизвести → найти корень (часто демо-данные / валидация / RLS) → починить классом
(не точечно) → typecheck+lint+build → коммит+пуш → проверить деплой.

---

## 9. С ЧЕГО НАЧАТЬ В НОВОМ ЗАХОДЕ
1. Прочитать этот файл + **`docs/ADMIN_AUDIT.md`**.
2. Спросить у пользователя текущий баг/задачу (он кликает и шлёт скрин), либо
   продолжить прокликивание админки/сайта.
3. Помнить грабли §1 (особенно **`z.guid()` вместо `z.uuid()`** и схема-квалификацию
   миграций).
4. Работать: воспроизвести → фикс классом → 3 проверки зелёные → коммит+пуш в `main`
   (автодеплой) → при необходимости дождаться сборки (§5) → обновить ADMIN_AUDIT.md.
