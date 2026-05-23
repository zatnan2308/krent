-- ============================================================
--  Krent: RLS для модулей бронирования и платежей.
--
--  Политики чтения — defense-in-depth: бронирования видны по
--  праву bookings.view, платёжные данные — по payments.view.
--  Запись идёт через сервис-клиент в server actions и webhook-
--  обработчиках, ПОСЛЕ явной проверки прав / подписи провайдера:
--  гостевое бронирование создаётся без аутентификации, а вебхук
--  платежа приходит вообще без пользователя.
-- ============================================================

alter table rental_bookings enable row level security;
alter table rental_guests enable row level security;
alter table rental_fees enable row level security;
alter table payment_providers enable row level security;
alter table payment_accounts enable row level security;
alter table rental_payments enable row level security;
alter table payment_transactions enable row level security;
alter table payment_webhooks enable row level security;
alter table refunds enable row level security;

-- ---- Бронирования: чтение по bookings.view ----------------
create policy "rental_bookings_select"
  on rental_bookings for select to authenticated
  using (app_private.has_permission(organization_id, 'bookings.view'));

create policy "rental_guests_select"
  on rental_guests for select to authenticated
  using (app_private.has_permission(organization_id, 'bookings.view'));

create policy "rental_fees_select"
  on rental_fees for select to authenticated
  using (app_private.has_permission(organization_id, 'bookings.view'));

-- ---- Платежи: чтение по payments.view ---------------------
create policy "payment_providers_select"
  on payment_providers for select to authenticated
  using (app_private.has_permission(organization_id, 'payments.view'));

create policy "payment_accounts_select"
  on payment_accounts for select to authenticated
  using (app_private.has_permission(organization_id, 'payments.view'));

create policy "rental_payments_select"
  on rental_payments for select to authenticated
  using (app_private.has_permission(organization_id, 'payments.view'));

create policy "payment_transactions_select"
  on payment_transactions for select to authenticated
  using (app_private.has_permission(organization_id, 'payments.view'));

create policy "payment_webhooks_select"
  on payment_webhooks for select to authenticated
  using (
    organization_id is not null
    and app_private.has_permission(organization_id, 'payments.view')
  );

create policy "refunds_select"
  on refunds for select to authenticated
  using (app_private.has_permission(organization_id, 'payments.view'));
