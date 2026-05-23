# Resend setup

## 1. Создайте Resend account

[resend.com](https://resend.com) → Add Domain → подтвердите DNS-записи
(SPF, DKIM, DMARC). Без верифицированного домена транзакционные письма
не уйдут.

## 2. API key

Resend → API Keys → Create. Скопируйте в env:

```
RESEND_API_KEY=re_...
EMAIL_FROM_DEFAULT="Krent <no-reply@your-domain.com>"
```

## 3. Webhook

Resend → Webhooks → Add endpoint:

- URL: `https://<your-domain>/api/email/webhook/resend`
- Events: `email.sent`, `email.delivered`, `email.bounced`,
  `email.complained`, `email.opened`, `email.clicked`,
  `email.unsubscribed`

Скопируйте `Signing secret`:

```
RESEND_WEBHOOK_SECRET=whsec_...
```

Подпись проверяется через Svix HMAC.

## 4. Marketing vs transactional

Транзакционные письма (booking confirmations, password reset, payment
receipts) отправляются всегда — без учёта `marketing_consents`.
Маркетинговые рассылки (campaigns) уважают unsubscribe и
`marketing_consents`. Это разделение реализовано в
`features/notifications/dispatcher.ts`.

## 5. Тест

В админке → Email → Templates → выберите шаблон → Send test. Получите
письмо на ваш ящик за несколько секунд.
