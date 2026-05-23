# Meta integrations setup

## 1. Meta for Developers

[developers.facebook.com/apps](https://developers.facebook.com/apps) →
Create App → Business type → Continue.

## 2. Подключите Marketing API

App → Add Products → Marketing API → Set up.

## 3. OAuth redirect

App → Facebook Login → Settings:

- Valid OAuth redirect URIs:
  `https://<your-domain>/api/integrations/oauth/meta_ads/callback`

## 4. Environment

```
META_APP_ID=...
META_APP_SECRET=...
META_OAUTH_REDIRECT_URL=https://<your-domain>/api/integrations/oauth/meta_ads/callback
```

## 5. Permissions

Запрашиваемые scopes: `ads_read`, `ads_management`. Для production
требуется App Review (Facebook проверяет use-case).

## 6. Pixel / CAPI

После подключения вы можете сохранить Pixel ID + CAPI token в
`tracking_settings` (`/dashboard/analytics → tracking settings`).
Тогда события `lead_form_submit`, `booking_completed` и др. будут
отправляться через CAPI с server-side подписью.

## 7. Honest status

Если `META_APP_ID/SECRET/REDIRECT_URL` не заданы — UI показывает
«Requires API credentials» и не разрешает Connect.
