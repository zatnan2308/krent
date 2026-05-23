-- ============================================================
--  Krent: production reliability для исходящих webhook'ов.
--  Retry с экспоненциальным backoff (attempts + next_attempt_at)
--  и rotation секретов (previous_secret хранится до истечения).
-- ============================================================

alter table webhook_events
  add column attempts integer not null default 0,
  add column last_error text,
  add column next_attempt_at timestamptz;

create index idx_webhook_events_due
  on webhook_events (next_attempt_at)
  where status = 'pending';

alter table webhook_endpoints
  add column previous_secret text,
  add column secret_rotated_at timestamptz;
