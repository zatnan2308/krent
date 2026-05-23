# Client launch checklist

Перед открытием сайта для гостей.

## Domain & deployment

- [ ] Production-домен подключён в Vercel
- [ ] SSL прошёл проверку
- [ ] Запись в `domains` со `status = 'verified'`, `is_primary = true`
- [ ] `NEXT_PUBLIC_SITE_URL` указывает на этот домен
- [ ] DNS records: A/CNAME на Vercel, MX/SPF/DKIM/DMARC для Resend
- [ ] `robots.txt` и `sitemap.xml` отдают правильный контент
- [ ] Search Console: sitemap отправлен

## Organization data

- [ ] `organizations.name`, `slug`, `default_currency`, `default_language`,
      `enabled_languages`, `timezone` заполнены
- [ ] `brand_settings` (логотип, цвета, fonts) загружены
- [ ] `seo_settings`: `robots_index = true`, дефолтные meta-теги
- [ ] CMS: главная страница опубликована, основные `pages` есть
- [ ] Navigation menu настроен

## Properties

- [ ] Загружены первые объекты с фото и переводами
- [ ] `area_pages` под целевые города/районы созданы
- [ ] У объектов выставлены `visibility=public`, `status=active`
- [ ] Цены и доступность настроены

## CRM & portals

- [ ] Sales pipeline в `deal_stages` настроен
- [ ] Роли `org_owner`, `agent`, `viewer` присвоены реальным
      пользователям
- [ ] Portal access flow проверен (invite → accept)

## Bookings & payments

- [ ] Минимум один payment provider включён и проверен (Stripe live
      mode для production)
- [ ] PayPal/crypto настроены, если клиент их продаёт
- [ ] Webhook'и Stripe/PayPal приходят и обновляют статусы
- [ ] iCal sync для Airbnb/Booking настроен и работает

## Notifications

- [ ] Resend домен верифицирован, тестовое письмо приходит
- [ ] Все `notification_templates` (booking_confirmed, lead_received,
      …) переведены и проверены
- [ ] Marketing consent — настроен баннер unsubscribe и страница
      `/unsubscribe`

## Analytics & ads

- [ ] `tracking_settings` заполнены (GA4 / GTM / Pixel ID)
- [ ] Consent banner присутствует
- [ ] Integrations connected: Search Console, Google Ads, Meta (если
      клиент их использует)

## Agency API

- [ ] Если клиент даёт API внешним агентам — выписан хотя бы один
      `api_keys` со scopes и `allowed_domains`
- [ ] Widget snippet протестирован на стороннем тестовом сайте

## Super Admin

- [ ] Issued license через `/super-admin/licenses`
- [ ] License key передан клиенту защищённым каналом
- [ ] Модули, которыми клиент не пользуется, выключены через
      `organization_modules`

## Final smoke test

- [ ] Зайти на главную как гость, найти объект, отправить лид-форму
- [ ] Зайти как агент, увидеть лид в CRM
- [ ] Создать тестовое бронирование, оплатить тестовой картой Stripe
- [ ] Получить email-подтверждение
- [ ] Зайти в `/dashboard/analytics` — увидеть события
- [ ] Зайти в `/dashboard/reports` — увидеть метрики
- [ ] Зайти в `/super-admin/health` — нет pending webhook/notifications
