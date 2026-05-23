# Krent — Full Commercial Release

White-label платформа для агентств недвижимости и property management
компаний. Полный коммерческий релиз: один установочный комплект включает
все модули — CMS, каталог недвижимости, CRM, клиентские порталы,
realtime-чат, календарь аренды, бронирования и платежи, e-mail и
рассылки, SEO, аналитику, рекламные интеграции, Agency API, виджеты и
Super Admin.

Это не SaaS с тарифами. Лицензия фиксирует, какой клиент получил копию
платформы; включение и выключение модулей — техническая настройка
установки.

## Документация

### Setup
- [installation-guide.md](setup/installation-guide.md) — общий процесс установки
- [environment-variables.md](setup/environment-variables.md)
- [supabase-setup.md](setup/supabase-setup.md)
- [deployment-vercel.md](setup/deployment-vercel.md)
- [domain-setup.md](setup/domain-setup.md)
- [stripe-setup.md](setup/stripe-setup.md)
- [paypal-setup.md](setup/paypal-setup.md)
- [crypto-payment-setup.md](setup/crypto-payment-setup.md)
- [resend-setup.md](setup/resend-setup.md)
- [google-integrations-setup.md](setup/google-integrations-setup.md)
- [meta-integrations-setup.md](setup/meta-integrations-setup.md)
- [search-console-setup.md](setup/search-console-setup.md)

### Architecture
- [database.md](architecture/database.md)
- [multi-tenant.md](architecture/multi-tenant.md)
- [permissions.md](architecture/permissions.md)
- [modules.md](architecture/modules.md)
- [licenses.md](architecture/licenses.md)

### Agency API
- [public-api.md](api/public-api.md)
- [widgets.md](api/widgets.md)
- [webhooks.md](api/webhooks.md)

### Marketing
- [seo.md](marketing/seo.md)
- [analytics.md](marketing/analytics.md)
- [ads-integrations.md](marketing/ads-integrations.md)

### Operations
- [security-checklist.md](operations/security-checklist.md)
- [client-launch-checklist.md](operations/client-launch-checklist.md)
- [maintenance-guide.md](operations/maintenance-guide.md)

### Reviews
- [security.md](reviews/security.md)
- [performance.md](reviews/performance.md)

## Стек

- Next.js 14 (App Router) + React 18 + TypeScript 5 (strict)
- Supabase Postgres 17 (RLS, Storage, Auth, Realtime)
- Tailwind CSS + shadcn/ui
- Stripe, PayPal REST, crypto manual workflow
- Resend для транзакционных и маркетинговых писем
- Vercel deploy + Vercel Cron
