# Google integrations setup

Krent подключается к Google через единый OAuth-flow для Search Console
и Google Ads. Если клиент использует обе — достаточно одной пары
credentials, scopes выбираются на этапе авторизации.

## 1. Google Cloud project

[console.cloud.google.com](https://console.cloud.google.com) → создайте
проект или выберите существующий клиента.

Включите APIs:
- Google Search Console API
- Google Ads API (требует developer token — см. ниже)

## 2. OAuth consent screen

APIs & Services → OAuth consent screen:

- User type: External (если клиенту это допустимо)
- App name: например, «Krent Integration»
- Authorized domains: домен клиента
- Scopes: добавьте `webmasters.readonly`, `adwords`

## 3. OAuth client

APIs & Services → Credentials → Create credentials → OAuth client ID:

- Application type: Web application
- Authorized redirect URI: `https://<your-domain>/api/integrations/oauth/gsc/callback`
  и `https://<your-domain>/api/integrations/oauth/google_ads/callback`

Скопируйте `Client ID` и `Client secret` в env:

```
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
GOOGLE_OAUTH_REDIRECT_URL=https://<your-domain>/api/integrations/oauth/gsc/callback
```

## 4. Подключение в Krent

Dashboard → Integrations → Google Search Console / Google Ads → Connect
with OAuth. Krent редиректит на Google, после approval сохраняет
зашифрованный access_token + refresh_token в `integration_tokens`.

## 5. Google Ads developer token

Для боевых вызовов Google Ads API клиенту нужен developer token:
[developers.google.com/google-ads/api/docs/first-call/dev-token](https://developers.google.com/google-ads/api/docs/first-call/dev-token).
Token хранится на стороне клиентского Cloud project, Krent его не хранит.

## 6. Sync job

Cron-эндпоинт `/api/cron/integrations-sync` (если включён в `vercel.json`)
обходит активные connections и обновляет отчёты. Защищён CRON_SECRET.

## 7. Honest status

Если `GOOGLE_OAUTH_CLIENT_ID/SECRET/REDIRECT_URL` не заданы — UI
покажет «Requires API credentials» и не запустит fake-success.
