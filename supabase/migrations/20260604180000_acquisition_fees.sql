-- ============================================================
--  Krent: ставки расчёта стоимости приобретения (acquisition) на
--  странице объекта. Раньше были захардкожены под Дубай (DLD 4% /
--  agency 2% / registration 0.25%). Выносим в brand_settings, чтобы
--  white-label-организации задавали свои значения. Дефолты совпадают
--  с прежним поведением.
-- ============================================================

alter table brand_settings
  add column if not exists acq_transfer_pct numeric not null default 4,
  add column if not exists acq_agency_pct numeric not null default 2,
  add column if not exists acq_registration_pct numeric not null default 0.25;
