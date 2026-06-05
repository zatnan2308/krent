# 📨 Multi-channel messaging — хэндофф для продолжения

> Фича построена (7 фаз, коммиты `e47096d..ad316f4`, в `main`). Этот файл — что
> сделано, как устроено, что осталось (с file-указателями) и конвенции, чтобы
> СРАЗУ продолжить в новом чате. Отвечать по-русски.

## 0. МОДЕЛЬ — НЕ НАРУШАТЬ
**Self-hosted продукт.** Каждая копия Krent у своего покупателя, со СВОИМИ
аккаунтами. Креды каналов — ТОЛЬКО из env (как Stripe). **НЕТ** Meta Tech
Provider / Embedded Signup / OAuth-флоу оператора / мультитенант-onboarding.
Секреты не уходят в браузер; подпись входящих — по app secret покупателя.

## 1. Режим работы
Непрерывно: фикс → `npm run typecheck` · `npm run lint` · `npm run build` (все
зелёные) → commit+push в `main`. Коммит в конце каждого пункта. Коммиты
заканчивать `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
PowerShell ломается на `&` в `-m` — несколько `-m` без `&`.

## 2. Конвенции/грабли (выстрадано)
- **Секреты — env** (`src/features/messaging/config.ts`: `getWhatsAppConfig`/
  `getTelegramConfig`/`getMessengerConfig`). `messaging_connections.encrypted_token` —
  опциональный override, НЕ основной источник.
- **RLS**: чтение messaging-таблиц по `crm.view`; запись — сервис-клиентом
  (`createAdminClient`) в server actions после проверки прав.
- **Connect-экшены** гейтятся `analytics.view` (как Integrations); **send** — `crm.manage`.
- **Админка — хардкод English** (i18n только публичные `[locale]`). Новые строки
  messaging-админки — English.
- **Supabase MCP-миграции**: пустой search_path → схема-квалифицировать
  (`public.*`, `app_private.has_permission`, `public.set_updated_at`); `gen_random_uuid()`
  ок без префикса. После apply — локальный файл `supabase/migrations/<ts>_*.sql`
  (следующий timestamp после `20260605150000`) + вручную дополнить `src/types/database.ts`.
- project_id Supabase: `pclhwbgsxdztriqdtosg`. Демо-орг `11111111-1111-1111-1111-111111111111`.
- Перед сверкой версий Meta/Telegram — проверять live-docs (Graph latest v25.0;
  версия в env `META_GRAPH_VERSION`, дефолт v23.0).

## 3. Карта кода (где что)
- БД: миграция `supabase/migrations/20260605150000_messaging_foundation.sql`
  (+ типы в `src/types/database.ts`). Таблицы: `messaging_connections`,
  `contact_channel_identities`, `messaging_conversations`, `messaging_messages`,
  `messaging_attachments`, `messaging_read_state`. Бакет `messaging-media`.
- `src/features/messaging/`:
  - `types.ts`, `channels.ts` (labels, `CHANNEL_HAS_SESSION_WINDOW`), `config.ts` (env),
  - `store.ts` — ядро: `resolveConnectionByRouting`, `ensureContactIdentity`
    (+`preferredContactId`), `ensureConversation`, `recordInbound/OutboundMessage`,
    `attachInboundMedia`, `attachmentTypeFromMime`,
  - `adapters/` — `types.ts` (`MessageChannelAdapter`: sendText/sendMedia),
    `registry.ts` (`getMessageAdapter`), `telegram.ts`, `whatsapp.ts`, `messenger.ts`,
  - `actions.ts` — connect{Telegram,WhatsApp,Messenger}, disconnectChannel,
    sendChannelMessage (24ч-окно), sendChannelProperty, markChannelConversationRead,
  - `queries.ts` — getChannelConnections, listChannelConversations,
    getChannelConversationView, getChannelUnreadCount, getContactChannels, getMessagingStats,
  - UI: `messaging-channels-card.tsx` (Integrations), `inbox-screen.tsx` (renderInbox),
    `messaging-thread.tsx` (channel-aware composer + attach property), `contact-channels.tsx`.
- Вебхуки: `src/app/api/webhooks/{telegram,whatsapp,messenger}/route.ts`.
- Инбокс: `src/app/(dashboard)/dashboard/messages/page.tsx` (renderInbox; портал `?c=`,
  канал `?m=`, фильтр `?filter=`). Бейдж — `src/app/(dashboard)/layout.tsx`.
- env: `src/lib/env.ts` (WHATSAPP_*/TELEGRAM_*/MESSENGER_*/META_GRAPH_VERSION).
- Гайд покупателя: `SETUP.md`.

## 4. ОСТАЛОСЬ (доработки; фича рабочая) — по приоритету

### ✅ Сделано (2026-06-05, коммиты `cfe22dc..cf53aef`)
1. **Статусы доставки** — ✅ `cfe22dc`. WA `value.statuses[]` + Messenger
   `delivery`/`read` → `store.updateOutboundStatus` / `markOutboundStatusByWatermark`
   (rank-guard от понижения). Индикатор статуса под исходящими в треде
   (`messaging-thread.tsx`, поле `status` в `getChannelConversationView`). Попутно
   починен баг: Messenger delivery/read раньше создавали пустые входящие.
2. **Колокол на входящее** — ✅ `472b0ac`. `messaging/notifications.ts`
   `notifyInboundChannelMessage` (получатель: агент диалога → агент лида → первый
   активный сотрудник) вызывается из `store.recordInboundMessage`. Новый event type
   `messaging.inbound` (нетранзакционный) — миграция `20260605160000` (посев
   `notification_templates` + системный `email_templates`, применено к
   `pclhwbgsxdztriqdtosg`). Кормит колокол (`notification_logs`) + письмо.
3. **Deep-link кнопки** — ✅ `1c0b616` (+ лид `cf53aef`). `getPropertyMessagingLinks`
   + `PropertyChannelLinks` на публичной странице объекта (Telegram `start=p_<id>`,
   Messenger `ref=p_<id>`, WhatsApp `wa.me` с prefill). Лид-страница: `getLeadMessagingLinks`
   + `ChannelDeepLinks` (копируемые `l_<id>` ссылки — отдать лиду). Общий core
   `buildOrgChannelLinks`.
4. **Каналы в Analytics → Lead sources** — ✅ `001efdf`. Канальные диалоги за окно
   мержатся в `leadSources` (`analytics/queries.ts`, лейблы каналов).
5. **Deal/Booking quick actions** — ✅ `796373a`. `ContactChannels` в карточке
   Contact (`crm/deals/[id]`) и Guest (`bookings/[id]`), контекстно.
6. **Медиа/файл из composer** — ✅ `7fed2de`. `sendChannelMedia` (FormData →
   приватный бакет → signed URL → `adapter.sendMedia` → исходящее + вложение);
   строка attach-file в composer. Хелперы `uploadMessagingMedia`/
   `createMessagingMediaSignedUrl`/`insertMessagingAttachment` (общие in/out).
8. **WhatsApp template-picker вне окна** — ✅ `771c166`. `whatsappListTemplates`
   (Management API, только APPROVED без `{{}}`) → picker в закрытом окне →
   `sendChannelTemplate`. `templates` в `getChannelConversationView`.
9. **Messenger message tags вне окна** — ✅ `79a58be`. `fbSend` с `MESSAGE_TAG`,
   `messengerSendTaggedText`, `sendChannelTag`; picker тегов (HUMAN_AGENT и др.)
   в закрытом окне Messenger.

### Осталось (нужно продуктовое решение)
7. **Booking-confirmation шаблон** из брони. ⚠️ Реальный шаблон брони требует
   ПАРАМЕТРОВ (даты/объект/референс) — текущий `whatsappSendTemplate` шлёт by-name
   без params. Нужно: (а) расширить `whatsappSendTemplate` на body-компоненты;
   (б) хранить имя шаблона + маппинг переменных (поле в brand/settings, т.к. имя
   шаблона у каждого покупателя своё). Без этого — только parameterless заглушка.
10. **Merge контактов** (TG/Messenger создают новый контакт без совпадения).
    Крупная CRM-фича: перенос идентичностей/диалогов/лидов/сделок с контакта A на B
    + UI выбора цели. Низкий приоритет.

**НЕ делать:** Viber, BSP, AI, Embedded Signup/Tech Provider.

## 5. Отдельный бэклог (не мессенджинг)
5 отложенных пунктов аудита — см. `docs/AUDIT_FIXES_HANDOFF.md` (pending-гость,
internal-чат, races-RPC, TZ, realtime append).
