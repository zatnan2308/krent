# Webhooks

Krent отправляет HTTP-уведомления на endpoint'ы агентов и сайтов риэлторов
при значимых событиях. Подписка управляется через Dashboard → Agent Sync →
Webhook endpoints.

## Доставка

Каждое событие создаёт запись в `webhook_events`. Затем синхронно
отправляется POST на все активные endpoint'ы организации, у которых событие
включено в `event_types` (либо `event_types` пуст — значит «все»).

- Метод: `POST`
- Content-Type: `application/json`
- Timeout: 7 секунд
- Тело:

```json
{
  "id": "<event-uuid>",
  "type": "lead.created",
  "organization_id": "<uuid>",
  "entity_type": "lead",
  "entity_id": "<uuid>",
  "occurred_at": "2026-05-23T10:00:00.000Z",
  "payload": { /* контекст события */ }
}
```

## Подпись

Если у endpoint'а задан `secret`, в запрос добавляется заголовок:

```http
x-krent-signature: <HMAC-SHA256(secret, body), base64>
x-krent-event-id: <event-uuid>
x-krent-event-type: <event-type>
```

Проверка на стороне получателя:

```ts
import { createHmac, timingSafeEqual } from "node:crypto";

const expected = createHmac("sha256", secret)
  .update(rawBody, "utf8")
  .digest("base64");

const signatureHeader = request.headers.get("x-krent-signature") ?? "";
if (
  expected.length !== signatureHeader.length ||
  !timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader))
) {
  return new Response("Invalid signature", { status: 401 });
}
```

## Поддерживаемые события

| Тип | Когда |
| --- | --- |
| `property.created` | Создание объекта |
| `property.updated` | Любое изменение объекта |
| `property.deleted` | Удаление объекта |
| `property.published` | Visibility → public |
| `property.unpublished` | Visibility → не public |
| `property.price_changed` | Изменение `amount` или `currency` |
| `property.status_changed` | Изменение статуса |
| `property.media_updated` | Добавление/удаление media |
| `property.availability_updated` | Изменение календаря (зарезервировано) |
| `booking.created` | Новый запрос на бронирование |
| `booking.cancelled` | Отмена бронирования |
| `lead.created` | Новый лид (включая Agency API) |

## Лог попыток

Каждая попытка пишется в `webhook_delivery_logs` (статус `success` / `failed`,
HTTP-код, первые 2 KB ответа). После всех попыток `webhook_events.status`
переходит в `delivered` (хотя бы один успех) или `failed`.

## Retry

Доставка делает несколько попыток с экспоненциальным backoff. После каждой
неудачной попытки строка `webhook_delivery_logs` пишется со статусом
`failed` и значением `attempt`. Расписание ретраев задаётся в
`features/agency-api/webhooks.ts → RETRY_DELAYS_MS`. Если все попытки
исчерпаны, `webhook_events.status = 'failed'` и событие можно перезапустить
вручную из Dashboard → Agent Sync.

## Best practices для получателей

- Отвечайте 2xx максимально быстро (≤ 7s).
- Делайте обработку идемпотентной по `x-krent-event-id`.
- Не пытайтесь возвращать большие тела — Krent логирует первые 2 KB ответа.
- Проверяйте `x-krent-signature` всегда, не делайте «доверчивых» получателей.
