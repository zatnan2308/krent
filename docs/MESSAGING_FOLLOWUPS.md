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
1. **Статусы доставки** — обрабатывать `value.statuses[]` в `/api/webhooks/whatsapp`
   (и delivery/read у Messenger) → обновлять `messaging_messages.status`
   (delivered/read/failed). Высокая ценность.
2. **Колокол на входящее** — в `store.recordInboundMessage` (или в вебхуках после
   записи) создавать событие нотификации, как `chat/notifications.ts notifyNewMessage`.
   Сейчас входящее кормит только бейдж Messages.
3. **Deep-link кнопки** на странице объекта/лида/публичном сайте:
   `t.me/<bot>?start=p_<id>` и `m.me/<page>?ref=p_<id>` (вебхуки их уже парсят).
   Бот/страницу брать из `messaging_connections`. Это вход для TG/Messenger лидов.
4. **Каналы в Analytics → Lead sources** (`src/features/analytics/queries.ts` +
   `analytics/page.tsx`) — добавить каналы к источникам (есть `getMessagingStats`).
5. **Deal/Booking quick actions** — карточка `ContactChannels` на
   `crm/deals/[id]` и `bookings/[id]` (1:1 как на `crm/leads/[id]` и контакте).
6. **Медиа/файл из composer** — upload в `messaging-media` + signed/public URL →
   `adapter.sendMedia`. (`messaging-thread.tsx`.)
7. **Booking-confirmation шаблон** из брони (`whatsappSendTemplate` уже есть).
8. **Шаблоны WhatsApp UI + template-picker в composer вне окна** (Management API list).
   Сейчас вне 24ч composer блокируется; отправка by-name есть, picker нет.
9. **Messenger message tags** вне окна (аналог п.8).
10. **Merge контактов** (TG/Messenger создают новый контакт без совпадения).

**НЕ делать:** Viber, BSP, AI, Embedded Signup/Tech Provider.

## 5. Отдельный бэклог (не мессенджинг)
5 отложенных пунктов аудита — см. `docs/AUDIT_FIXES_HANDOFF.md` (pending-гость,
internal-чат, races-RPC, TZ, realtime append).
