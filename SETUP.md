# Krent — Self-Hosting & Messaging Setup

Krent ships as a **one-time, self-hosted product**. Each buyer runs their **own
copy** on their **own hosting** and connects their **own** third-party accounts.
There is **no central platform** and no ongoing operator: every channel uses the
**buyer's own credentials**, configured at handoff via environment variables.

> Secrets live **only** in server-side environment variables (the same convention
> as the Stripe secret key). Nothing secret is ever sent to the browser or
> required to pass through accounts owned by the seller.

---

## 1. Core platform env vars

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Supabase anon key |
| `NEXT_PUBLIC_SITE_URL` | yes | Public base URL of this instance (used to build webhook URLs) |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Service role key (server only) |
| `ENCRYPTION_KEY` | **prod** | 32-byte key (hex or base64) for AES-256-GCM at-rest encryption of any persisted secrets. Generate: `openssl rand -base64 32` |

Payments use the buyer's own Stripe/PayPal keys (`STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`, `PAYPAL_*`) — see the existing payments docs.

---

## 2. Multi-channel messaging

Three channels — **WhatsApp (Cloud API)**, **Telegram (Bot API)**, and
**Facebook Messenger (Page Graph API)** — appear in one unified inbox alongside
the existing portal chats. Each channel is **optional**: if its env vars are not
set, the channel is simply inactive (the admin shows "not configured").

Meta API versions change over time. Set `META_GRAPH_VERSION` and keep it current
(latest is published at
<https://developers.facebook.com/docs/graph-api/changelog/versions/>). You — the
buyer — own your Meta App, its App Review, and any business verification for your
own number/page.

| Variable | Channel | Notes |
|---|---|---|
| `META_GRAPH_VERSION` | WhatsApp + Messenger | e.g. `v23.0` (default if unset). Keep current. |
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp | From your WhatsApp Business number |
| `WHATSAPP_WABA_ID` | WhatsApp | Your WhatsApp Business Account id |
| `WHATSAPP_ACCESS_TOKEN` | WhatsApp | Permanent system-user / app access token |
| `WHATSAPP_APP_SECRET` | WhatsApp | Meta App secret — verifies inbound `X-Hub-Signature-256` |
| `WHATSAPP_VERIFY_TOKEN` | WhatsApp | Any random string; entered in Meta webhook config |
| `WHATSAPP_BOOKING_TEMPLATE` | WhatsApp | _(optional)_ Approved template name for the booking-confirmation button |
| `WHATSAPP_BOOKING_TEMPLATE_LANG` | WhatsApp | _(optional)_ Template language code (default `en_US`) |
| `TELEGRAM_BOT_TOKEN` | Telegram | From @BotFather |
| `TELEGRAM_WEBHOOK_SECRET` | Telegram | Any random string; sent back in `X-Telegram-Bot-Api-Secret-Token` |
| `MESSENGER_PAGE_ID` | Messenger | Your Facebook Page id |
| `MESSENGER_PAGE_ACCESS_TOKEN` | Messenger | Long-lived Page access token |
| `MESSENGER_APP_SECRET` | Messenger | Meta App secret (may equal `WHATSAPP_APP_SECRET` if same app) |
| `MESSENGER_VERIFY_TOKEN` | Messenger | Any random string; entered in Meta webhook config |

Webhook URLs to register (replace host with your `NEXT_PUBLIC_SITE_URL`):

- WhatsApp: `https://<host>/api/webhooks/whatsapp`
- Telegram: `https://<host>/api/webhooks/telegram`
- Messenger: `https://<host>/api/webhooks/messenger`

### 2.1 WhatsApp (Cloud API) — your own Meta App

1. Create a **Meta App** (type *Business*) at <https://developers.facebook.com/>.
2. Add the **WhatsApp** product; create/select a **WhatsApp Business Account**
   and a **phone number**. Copy the **Phone number ID** and **WABA ID**.
3. Create a permanent **access token** (System User token recommended) with
   `whatsapp_business_messaging` (+ `whatsapp_business_management`).
4. In **App settings → Basic**, copy the **App secret**.
5. Set `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_WABA_ID`, `WHATSAPP_ACCESS_TOKEN`,
   `WHATSAPP_APP_SECRET`, and any `WHATSAPP_VERIFY_TOKEN` you choose.
6. In **WhatsApp → Configuration → Webhook**, set the callback URL above and the
   verify token; subscribe to the `messages` field.
7. _(Existing-number / Coexistence is possible — your number stays in your own
   Meta Business and access is revocable.)_

### 2.2 Telegram (Bot API) — your own bot

1. Open **@BotFather**, run `/newbot`, copy the **bot token**.
2. Set `TELEGRAM_BOT_TOKEN` and a random `TELEGRAM_WEBHOOK_SECRET`.
3. Register the webhook from the admin settings screen (or it self-registers on
   first use). A Telegram bot can only message users who **started it first** —
   share the `t.me/<bot>?start=<token>` deep link from Properties/Leads.

### 2.3 Facebook Messenger — your own Page

1. In your Meta App, add **Messenger** and the `pages_messaging` +
   `pages_manage_metadata` permissions.
2. Connect your **Facebook Page** and obtain a long-lived **Page access token**.
3. Set `MESSENGER_PAGE_ID`, `MESSENGER_PAGE_ACCESS_TOKEN`, `MESSENGER_APP_SECRET`,
   `MESSENGER_VERIFY_TOKEN`.
4. In **Messenger → Settings → Webhooks**, set the callback URL above and verify
   token; subscribe to `messages`, `messaging_postbacks`.

> No Embedded Signup / Tech Provider flow is used. There is no OAuth onboarding
> operated by the seller — you configure everything under your own accounts.

### 2.4 Templates & message tags

- **WhatsApp** requires an **approved template** to message a contact outside the
  24-hour window. Create and submit templates in your own **Meta WhatsApp Manager**
  (category + language); the app sends an approved template **by name**. Suggested
  starters: booking confirmation, viewing reminder, new-listing announcement.
- **Messenger** allows an **allowed message tag** outside the 24-hour window.
- **Telegram** needs no templates — replies are free once the user has started the bot.

The unified inbox composer enforces these rules automatically: free text inside the
window, and a clear prompt to use a template/tag when the window is closed. The
composer lists your **parameterless** approved templates for WhatsApp; templates with
variables are sent through dedicated flows (see below).

**Booking-confirmation template.** The booking page has a one-click *Send WhatsApp
confirmation* button. Create an approved template with **four body variables in this
order** and point `WHATSAPP_BOOKING_TEMPLATE` (+ optional `WHATSAPP_BOOKING_TEMPLATE_LANG`,
default `en_US`) at it:

| Variable | Maps to |
|---|---|
| `{{1}}` | Property title |
| `{{2}}` | Check-in date |
| `{{3}}` | Check-out date |
| `{{4}}` | Booking reference |

Example body: `Hi! Your booking for {{1}} is confirmed. Check-in {{2}}, check-out {{3}}. Reference {{4}}.`
The button appears only when the variable is set and the booking has a guest phone.
