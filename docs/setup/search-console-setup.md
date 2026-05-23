# Google Search Console setup

## 1. Verify property

Google Search Console → Add property:

- Type: Domain property для всех поддоменов (рекомендуется).
- Verification: DNS TXT-запись или HTML-файл, доступный публично.

## 2. Permissions

В Search Console Settings → Users and permissions добавьте Google-
аккаунт клиента с правами Owner или Full user. Этот аккаунт будет
использоваться при OAuth-подключении Krent.

## 3. OAuth-flow

См. [google-integrations-setup.md](google-integrations-setup.md).
После подключения Krent сохранит access_token + refresh_token для
запроса `searchanalytics.query`.

## 4. Sitemap

Krent отдаёт `https://<your-domain>/sitemap.xml` — отправьте его в
Search Console → Sitemaps → Add new sitemap.

## 5. Data refresh

Sync-job (`/api/cron/integrations-sync`) раз в сутки тянет:
- `seo_reports` — daily totals (clicks, impressions, position, CTR)
- `seo_opportunities` — топ-запросы с ростом impressions

Эти данные доступны в `Dashboard → Integrations → Search Console`.
