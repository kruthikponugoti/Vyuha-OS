-- Self-service RLS for attendance & leave. Run once in the Supabase SQL editor,
-- AFTER schema.sql and the earlier migrations. Additive and idempotent.
--
-- Why: the base policies let only owner/admin/hr write attendance, and the
-- leave_requests write list grants employees update/delete too. That both
-- blocks employees from clocking themselves in AND would let an employee
-- approve their own leave via the raw API. These policies fix both:
--   * employees can read their OWN employee record (to resolve self-service),
--   * employees can insert/update their OWN attendance (clock in/out),
--   * employees can SUBMIT their own leave, but only owner/admin/hr/manager
--     can decide (update) or delete a leave request.

create or replace function app_user_id() returns uuid
language sql stable security definer set search_path = public as
$$ select id from users where auth_id = auth.uid() limit 1 $$;

create or replace function owns_employee(emp uuid) returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from employees e where e.id = emp and e.user_id = app_user_id()) $$;

-- employees: owner/admin/hr read all; a user may also read their own record.
drop policy if exists employees_read on employees;
create policy employees_read on employees for select
  using (business_id = app_business_id()
    and (has_role(array['owner','admin','hr']) or user_id = app_user_id()));

-- attendance: owner/admin/hr manage anyone; an employee may write their own row.
drop policy if exists attendance_insert on attendance;
create policy attendance_insert on attendance for insert
  with check (business_id = app_business_id()
    and (has_role(array['owner','admin','hr']) or owns_employee(employee_id)));

drop policy if exists attendance_update on attendance;
create policy attendance_update on attendance for update
  using (business_id = app_business_id()
    and (has_role(array['owner','admin','hr']) or owns_employee(employee_id)))
  with check (business_id = app_business_id());

-- leave_requests: employee may submit their own; only owner/admin/hr/manager decide.
drop policy if exists leave_requests_insert on leave_requests;
create policy leave_requests_insert on leave_requests for insert
  with check (business_id = app_business_id()
    and (has_role(array['owner','admin','hr','manager']) or owns_employee(employee_id)));

drop policy if exists leave_requests_update on leave_requests;
create policy leave_requests_update on leave_requests for update
  using (business_id = app_business_id() and has_role(array['owner','admin','hr','manager']))
  with check (business_id = app_business_id());

drop policy if exists leave_requests_delete on leave_requests;
create policy leave_requests_delete on leave_requests for delete
  using (business_id = app_business_id() and has_role(array['owner','admin','hr','manager']));
