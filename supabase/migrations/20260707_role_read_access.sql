-- Role-based access migration for an already-deployed Vyuha OS database.
-- Run this once in the Supabase SQL editor. It is additive to schema.sql and
-- only touches the HR/payroll policies; nothing else changes.
--
-- Effect:
--   * employees & payroll (salary data) become readable only by owner/admin/hr
--     — Finance, Sales, Manager, Employee, Viewer can no longer SELECT them via
--     the API. This backs the FAQ claim that Finance cannot access HR/payroll.
--   * payroll writes: remove finance (HR/owner/admin only).
--   * attendance writes: remove manager (HR/owner/admin only).
-- Reads for every other table stay member-wide (they're cross-referenced by
-- features each allowed role uses); those modules are protected by the app's
-- route guard + the existing per-table write policies.

-- ---- employees: restrict SELECT to owner/admin/hr -------------------------
drop policy if exists employees_read on employees;
create policy employees_read on employees for select
  using (business_id = app_business_id() and has_role(array['owner','admin','hr']));

-- ---- payroll: restrict SELECT to owner/admin/hr; tighten writes ------------
drop policy if exists payroll_read on payroll;
create policy payroll_read on payroll for select
  using (business_id = app_business_id() and has_role(array['owner','admin','hr']));

drop policy if exists payroll_insert on payroll;
create policy payroll_insert on payroll for insert
  with check (business_id = app_business_id() and has_role(array['owner','admin','hr']));

drop policy if exists payroll_update on payroll;
create policy payroll_update on payroll for update
  using (business_id = app_business_id() and has_role(array['owner','admin','hr']))
  with check (business_id = app_business_id());

drop policy if exists payroll_delete on payroll;
create policy payroll_delete on payroll for delete
  using (business_id = app_business_id() and has_role(array['owner','admin','hr']));

-- ---- attendance: remove manager from writes (HR/owner/admin only) ----------
drop policy if exists attendance_insert on attendance;
create policy attendance_insert on attendance for insert
  with check (business_id = app_business_id() and has_role(array['owner','admin','hr']));

drop policy if exists attendance_update on attendance;
create policy attendance_update on attendance for update
  using (business_id = app_business_id() and has_role(array['owner','admin','hr']))
  with check (business_id = app_business_id());

drop policy if exists attendance_delete on attendance;
create policy attendance_delete on attendance for delete
  using (business_id = app_business_id() and has_role(array['owner','admin','hr']));
