# Widgets

Виджет — самый простой способ для агента показать каталог объектов на
собственном сайте без интеграции через API.

## Что делает

1. Агент копирует embed-snippet из Dashboard → Agent Sync.
2. Snippet вставляется в HTML внешнего сайта.
3. Скрипт `/api/public/v1/widget.js` ищет `data-krent-widget-agent` блоки и
   вставляет iframe со страницей `/widget/<agentId>` основного домена.

## Snippet

```html
<div
  data-krent-widget-agent="<agent-uuid>"
  data-krent-widget-view="list"
  data-krent-widget-height="900"
></div>
<script src="https://krent.example.com/api/public/v1/widget.js" async></script>
```

Атрибуты:

- `data-krent-widget-agent` — обязательно, UUID агента из таблицы
  `agent_website_connections`.
- `data-krent-widget-view` — `list` (по умолчанию).
- `data-krent-widget-height` — число пикселей, по умолчанию `900`.

## Страница iframe

`/widget/[agentId]?view=list&locale=ru` — публичная, non-localized,
`robots: noindex`. Берёт первые 24 объекта агента и показывает упрощённую
сетку: фото обложки, заголовок, локация, цена.

Все фильтры приватности из [public-api.md](public-api.md) применяются.
`property_external_visibility` тоже учитывается.

## Кеширование

- Скрипт `widget.js` имеет `cache-control: public, max-age=300`.
- Страница `/widget/[agentId]` помечена `dynamic = "force-dynamic"`, чтобы
  изменения каталога публиковались сразу.

## Безопасность iframe

Виджет не передаёт куки и не выполняет код на сайте-родителе. Если
сторонний сайт небезопасен (HTTP, mixed content), iframe может не загрузиться.
Рекомендуем использовать только HTTPS-сайты и Subresource Integrity для
production.

## Кастомизация

Полная коммерческая версия включает:

- темы `light`, `dark`, `brand`, `custom` (через `data-krent-theme` и CSS-переменные `--krent-*`);
- режимы `list`, `grid`, `map`, `featured`, `compact`, `search`;
- JS-коллбеки `onPropertyClick`, `onLeadSubmit`, `onBookingRequest`,
  `onError` (см. [public-api.md](public-api.md#widget-callbacks)).
