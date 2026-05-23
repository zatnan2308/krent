# PayPal setup

## 1. Создайте PayPal Business + Developer app

1. PayPal Business account.
2. [developer.paypal.com](https://developer.paypal.com) → My Apps & Credentials
   → Create App.
3. Скопировать `Client ID` и `Secret`. Создайте отдельные пары для
   sandbox и live.

## 2. Environment variables

```
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_MODE=sandbox        # или live
PAYPAL_WEBHOOK_ID=...      # см. шаг 4
```

## 3. Return / cancel URLs

В Vercel настройте redirect URLs для PayPal:

- Return URL: `https://<your-domain>/api/payments/paypal/capture?return=<booking-confirmation-url>`
- Cancel URL: `https://<your-domain>/<booking-page>?paypal=cancel`

Адаптер автоматически добавит `token=<order_id>` в return URL после
approval — сервер вызовет capture и проставит платёжный статус.

## 4. Webhook

Developer dashboard → My Apps → выбранное приложение → Webhooks:

- URL: `https://<your-domain>/api/payments/webhook/paypal`
- Event types: `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.DENIED`,
  `PAYMENT.CAPTURE.REVERSED`, `CHECKOUT.ORDER.APPROVED`

Скопируйте `Webhook ID` в `PAYPAL_WEBHOOK_ID`. Подпись будет
проверена через PayPal REST `/v1/notifications/verify-webhook-signature`.

## 5. Тест

В sandbox-режиме создайте тестового покупателя в PayPal Sandbox →
Accounts. Сделайте тестовое бронирование, выберите PayPal — после
approval должен сработать `capture` и бронирование станет paid.

## 6. Refunds

Реализовано в `features/payments/providers/paypal.ts → refundCapture`.
UI: Dashboard → Bookings → Refund.
