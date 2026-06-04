# Krent — Admin UI/UX Redesign (трекер)

> Отдельный от `docs/ADMIN_AUDIT.md` (функциональный аудит) трекер
> **визуально-эргономического** редизайна админки. Задача: админка была
> «сухая/неудобная» — делаем красиво и удобно, с современными анимациями.
> Работаем стадиями, с визуальной проверкой после каждой.

## Направление (зафиксировано пользователем)
- Своя палитра админки, **НЕ** editorial-золото публичного сайта.
- **Чёрный/графит остаётся ведущим акцентом** («как сейчас»).
- **Светлый сайдбар + чёрные акценты** (выбор пользователя); контент-зона светлая.
- Премиальный современный SaaS-вид (Linear/Vercel/Geist-grade): глубина + моторика.
- Стадии с визуальной проверкой; **не уходить вперёд без явной команды**.

## Изоляция (критично — не сломать публичный сайт)
Публичный editorial-сайт использует shadcn-токены `:root` (public-header и др.) →
**`:root` НЕ трогаем**. Палитра админки живёт в scope **`.dashboard`**
(`src/styles/globals.css`); класс висит на корне `AppShell` и продублирован на
портальном мобильном drawer. Меняя `.dashboard`, публичный сайт / auth / account /
portal не затрагиваем. Шрифт Inter подключён глобально в `font-sans` (он же
`--font-geist`, которым уже пользуется editorial — поэтому безопасно).

## Стадия 1 — Фундамент ✅ (typecheck/lint/build зелёные, 53 стр.)
Дизайн-токены, шрифт, каркас, общие примитивы, моторика. Меняет облик **всей**
админки разом.
- **`tailwind.config.ts`**: `Inter → font-sans` (был системный); keyframes +
  animation `fade-in` / `fade-in-up` / `scale-in` / `shimmer`.
- **`globals.css`**: scope `.dashboard` (нейтральная палитра, графит-primary,
  `--radius` 0.625rem); `.app-surface` (off-white + точечная сетка); тонкий
  скроллбар админки.
- **Примитивы** (API без изменений): `Card` (transition), `Button`
  (`active:scale` + `transition-all`), `Badge` (+`info`, dot-ready), `Tabs`
  (сегментированный + fade контента), `Table` (премиум-заголовок caps),
  `Input`/`SelectTrigger` (`shadow-xs` + hover-border), `EmptyState` (чип-иконка).
- **Новые компоненты**: `PageHeader` (крошки + заголовок + слот действий),
  `StatCard` (метрика с hover-lift), `Skeleton` (shimmer).
- **Каркас**: `AppSidebar` (лого-чип, секции, чёрный активный пункт +
  микроанимации иконки/лейбла), `AppTopbar` (sticky + backdrop-blur), `AppShell`
  (scope `.dashboard`, `app-surface`, `fade-in-up` контента по `pathname`,
  `max-w-[1600px]`).
- **Overview** (`dashboard/page.tsx`): переведён на `PageHeader` + `StatCard`
  (витрина нового вида).

## Роадмап (по секциям, после фундамента)
- [ ] 2. Раскатка `PageHeader` на все страницы + виджеты Overview
- [x] 3. CRM ✅ — заголовки → `PageHeader` (+ крошки на detail), hub → `StatCard`, `CrmNav` → подчёркнутая под-навигация, фильтры/поиск → тулбар-cards
- [x] 4. Properties ✅ — список (PageHeader+actions, тулбар, таблица на bg-card), редактор объекта (крошки + **липкая панель сохранения**, компактный таб-бар), new/amenities/calendar → PageHeader
- [ ] 5. Rentals / Bookings / Calendar
- [ ] 6. Messages / Email
- [ ] 7. Growth (Marketing / SEO / Analytics / Reports / Integrations / Agent Sync → табы)
- [ ] 8. Website (Home: 12 табов → перекомпоновка; Pages / Navigation / About)
- [ ] 9. Settings (7 табов)
- [ ] 10. Финальный проход: анимации / пустые / загрузки / адаптив + QA

## Где что лежит (для следующих стадий)
- Каркас: `src/components/layout/{app-shell,app-sidebar,app-topbar,nav-config}.tsx`
- Примитивы: `src/components/ui/*` (`page-header`, `stat-card`, `skeleton` — новые)
- Токены/скоуп: `src/styles/globals.css` (`.dashboard`, `.app-surface`)
- Страницы: `src/app/(dashboard)/dashboard/**`, фичи: `src/features/*`
