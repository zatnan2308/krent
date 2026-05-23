# Crypto payment setup

Krent поддерживает crypto-приём через manual workflow: гость переводит
криптовалюту на указанный кошелёк, затем подаёт proof (tx hash, network,
скриншот), админ подтверждает или отклоняет.

## 1. Подключение в Dashboard

`/dashboard/settings → Payment providers → Add provider`:

- Provider: `crypto`
- Display name: например, «USDT TRC20»
- Settings (JSON): `{ "wallet_address": "T...", "network": "TRC20" }`
- Instructions: краткое описание для гостя — что переводить, какая сеть,
  сколько минут на подтверждение.

Для нескольких сетей создайте несколько провайдеров.

## 2. Гостевой поток

При выборе crypto в checkout:

1. Создаётся `rental_payments` со статусом `pending` и provider `crypto`.
2. Гость видит инструкцию + reference (id платежа).
3. Гость самостоятельно переводит крипту.
4. Подача proof — текущая версия предполагает участие админа: гость
   присылает tx hash менеджеру, менеджер вводит данные в
   `Dashboard → Bookings → details → Crypto proof`.

## 3. Admin review

`/dashboard/bookings/{id}` → секция Crypto proof:

- ввести `tx_hash`, `network`, `amount`, `currency`, ссылку на скриншот
- нажать Submit; запись попадает в `crypto_payment_proofs` со статусом
  `pending`
- кнопки Approve / Reject; на approve платёж → `succeeded`, бронирование
  → `confirmed`; на reject платёж → `failed`

## 4. БД

- `crypto_payment_proofs` — таблица с `tx_hash`, `network`, `amount`,
  `proof_url`, `status` (`pending`/`approved`/`rejected`),
  `reviewed_by`, `reviewed_at`, `reviewer_notes`
- RLS: select по праву `payments.view`
- запись/обновление — через service-клиент в server actions

## 5. Чек-лист для production

- [ ] Кошельки клиента созданы и проверены живым тестовым переводом
- [ ] Описаны инструкции для гостя (минимальное подтверждение блоков,
      время ожидания, что делать при ошибке)
- [ ] Менеджер обучен использовать форму proof
- [ ] Sample test pass-through в sandbox-режиме (через `manual` provider)
