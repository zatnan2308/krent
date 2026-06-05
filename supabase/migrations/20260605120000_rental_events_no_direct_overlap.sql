-- Защита от овербукинга на уровне БД.
--
-- Запрещает пересечение ПРЯМЫХ броней (status booked/pending,
-- import_source_id IS NULL) по одному объекту — закрывает TOCTOU-гонку, когда
-- два параллельных requestBooking проходят app-level проверку и оба пишут
-- событие. iCal-импорты (import_source_id задан) и ручные блокировки
-- (blocked/maintenance/cleaning) НЕ затрагиваются, чтобы не ломать
-- мультиканальную синхронизацию.
--
-- requestBooking уже ловит ошибку вставки события и возвращает
-- "These dates are no longer available" + удаляет осиротевшую бронь.
--
-- ПРИМЕЧАНИЕ (MCP-миграции с пустым search_path): btree_gist ставится в схему
-- extensions; для разрешения gist-опкласса по uuid временно добавляем
-- extensions в search_path.

create extension if not exists btree_gist with schema extensions;

set search_path = extensions, public;

alter table public.rental_calendar_events
  add constraint rental_calendar_events_no_direct_overlap
  exclude using gist (
    property_id with =,
    daterange(start_date, end_date, '[)') with &&
  )
  where (import_source_id is null and status in ('booked', 'pending'));
