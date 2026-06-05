-- ============================================================
--  Krent: устранение гонок read-then-write.
--  1) Rate-limit: атомарный upsert-инкремент вместо select→update
--     (две параллельные заявки больше не «теряют» инкремент и не
--     обходят лимит). Нужен unique (api_key_id, window_start).
--  2) Webhook-retry: атомарный захват пачки FOR UPDATE SKIP LOCKED,
--     чтобы параллельные прогоны не доставляли одно событие дважды.
-- ============================================================

-- Дедуп на случай ранее накопленных гонкой дублей (обычно 0).
delete from public.api_rate_limits a
using public.api_rate_limits b
where a.api_key_id = b.api_key_id
  and a.window_start = b.window_start
  and a.id < b.id;

create unique index if not exists api_rate_limits_key_window_key
  on public.api_rate_limits (api_key_id, window_start);

-- Атомарный «удар» по лимиту: инкремент окна и возврат — допускать ли запрос.
create or replace function public.api_rate_limit_hit(
  p_api_key uuid,
  p_org uuid,
  p_window timestamptz,
  p_limit integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  insert into public.api_rate_limits
    (organization_id, api_key_id, window_start, request_count)
  values (p_org, p_api_key, p_window, 1)
  on conflict (api_key_id, window_start)
  do update set request_count = public.api_rate_limits.request_count + 1
  returning request_count into v_count;
  return v_count <= p_limit;
end;
$$;

revoke all on function
  public.api_rate_limit_hit(uuid, uuid, timestamptz, integer) from public;
grant execute on function
  public.api_rate_limit_hit(uuid, uuid, timestamptz, integer) to service_role;

-- Атомарный захват просроченных вебхук-событий: бампит next_attempt_at в
-- будущее (бронь), пропускает залоченные конкурентом строки, возвращает id.
create or replace function public.claim_due_webhook_events(p_limit integer)
returns setof uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.webhook_events e
  set next_attempt_at = now() + interval '5 minutes'
  where e.id in (
    select id from public.webhook_events
    where status = 'pending' and next_attempt_at <= now()
    order by next_attempt_at asc
    limit p_limit
    for update skip locked
  )
  returning e.id;
end;
$$;

revoke all on function public.claim_due_webhook_events(integer) from public;
grant execute on function public.claim_due_webhook_events(integer) to service_role;
