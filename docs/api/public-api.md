# Public API

Agency API позволяет внешним сайтам риэлторов читать каталог объектов и
создавать лиды/запросы от имени агента. Реализация — `app/api/public/v1/*`.

## Аутентификация

Каждый запрос требует API-ключ:

```http
Authorization: Bearer krent_sk_<64 hex chars>
```

Альтернатива — заголовок `x-api-key`. Ключ выдаётся в Krent: Dashboard →
Agent Sync → API keys → Generate. **Сырой ключ показывается один раз**.

В `api_keys` хранится только sha256-хеш (`key_hash`) и видимый префикс
(`key_prefix`). Сравнение хешей — через `crypto.timingSafeEqual`.

Дополнительные ограничения ключа:

- `scopes` — какие endpoint'ы можно вызывать (см. список ниже).
- `allowed_domains` — белый список origin'ов (поддерживает wildcard
  `*.example.com`). Если пуст — без ограничения по домену.
- `rate_limit_per_minute` — окно 60 секунд, дефолт 60 req/min.
- `agent_id` — если задан, ключ может работать только с объектами этого
  агента.

## CORS

Pre-flight `OPTIONS` поддерживается на каждом endpoint'е. Заголовки:

```http
Access-Control-Allow-Origin: <echo Origin, если домен разрешён>
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: authorization, content-type, x-api-key
```

## Scopes

| Scope | Endpoint(ы) |
| --- | --- |
| `read:properties` | список объектов агента, JSON/XML/CSV фиды |
| `read:property_details` | детальная карточка объекта |
| `read:property_media` | медиа объекта |
| `read:property_amenities` | удобства |
| `read:property_availability` | календарь |
| `read:agent_profile` | публичный профиль агента |
| `create:leads` | POST лида |
| `create:showing_request` | POST showing request |
| `create:booking_request` | POST booking request |

## Endpoints

### GET `/api/public/v1/agents/{agentId}/properties`

Список объектов агента. Параметры: `limit` (1-200, default 50), `offset`,
`locale`. Возвращает массив `items` в формате `PublicPropertyShape`.

### GET `/api/public/v1/agents/{agentId}/feed?format=json|xml|csv`

Фиды для интеграций со сторонними системами. До 500 объектов за раз.

### GET `/api/public/v1/agents/{agentId}/profile`

Публичный профиль агента.

### GET `/api/public/v1/properties/{propertyId}`

Детальная карточка. Требует `agent_id`-scoped ключ.

### GET `/api/public/v1/properties/{propertyId}/media`

Список фото/видео.

### GET `/api/public/v1/properties/{propertyId}/amenities`

Список удобств.

### GET `/api/public/v1/properties/{propertyId}/availability?from=&to=`

События календаря в диапазоне дат.

### POST `/api/public/v1/leads`

Создание лида. Body (JSON):

```json
{
  "propertyId": null,
  "name": "Buyer Name",
  "email": "buyer@example.com",
  "phone": "+1 555 111 22 33",
  "message": "Free text",
  "source": "agent_site"
}
```

### POST `/api/public/v1/showing-requests`

Запрос на показ. Дополнительно `preferredAt` (ISO string).

### POST `/api/public/v1/booking-requests`

Запрос на бронирование. `startDate`, `endDate`, `guests` обязательны. Создаёт
лид типа `renter` + событие `booking.created` для подписчиков webhook.

## Ответы

- Успех: `200` (GET) / `201` (POST), JSON.
- Ошибка: `4xx`/`5xx`, JSON: `{ "error": "..." }`.
- `429` — превышен rate limit.
- `403` — scope/domain не подходят.
- `401` — невалидный или отсутствующий ключ.

## Restricted fields

В ответах **никогда** не возвращаются:

- контактные данные владельца объекта;
- internal notes;
- комиссия;
- точный адрес, если `property_locations.exact_address_visibility != "exact"`;
- private documents.

Дополнительно `property_external_visibility` позволяет скрыть конкретный
объект для конкретного agent-website-connection.

## Логирование

Каждый запрос пишется в `api_usage_logs` (status, method, path, IP).
Минутные счётчики rate limit — в `api_rate_limits`.
