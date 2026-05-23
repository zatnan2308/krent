# Stripe setup

## 1. Создайте Stripe account

[stripe.com/register](https://dashboard.stripe.com/register). Включите
live-mode, когда готовы принимать реальные платежи.

## 2. API key

Dashboard → Developers → API keys → `Secret key`.
Положите в env:

```
STRIPE_SECRET_KEY=sk_live_...
```

## 3. Webhook

Dashboard → Developers → Webhooks → Add endpoint:

- URL: `https://<your-domain>/api/payments/webhook/stripe`
- Events: `payment_intent.succeeded`, `payment_intent.payment_failed`,
  `charge.refunded`, `checkout.session.completed`

Скопируйте `Signing secret`:

```
STRIPE_WEBHOOK_SECRET=whsec_...
```

## 4. Проверка

В Stripe Dashboard → Developers → Webhooks → Send test event.
В админке Krent → Bookings → одно из бронирований должно перейти в
`succeeded` после успешного теста.

## 5. Refunds

Stripe refunds выполняет адаптер `features/payments/providers/stripe.ts`
через `refundPayment`. UI вызова — в админке бронирования (Dashboard →
Bookings → details → Refund).
