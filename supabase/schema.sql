-- Vyuha OS — full schema. Run once in the Supabase SQL editor, then seed.sql.
-- Every table is scoped to a business; RLS enforces membership for reads and
-- role lists for writes (viewer is read-only everywhere).

create extension if not exists "pgcrypto";
-- For knowledge-base semantic search (available on Supabase by default):
create extension if not exists vector;

-- ---------------------------------------------------------------------------
-- Core: businesses & users
-- ---------------------------------------------------------------------------

create table if not exists businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry text not null default 'Retail',
  country text not null default 'India',
  currency text not null default 'INR',
  timezone text not null default 'Asia/Kolkata',
  logo_url text,
  created_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid unique references auth.users(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  email text not null,
  role text not null default 'viewer'
    check (role in ('owner','admin','manager','finance','sales','hr','employee','viewer')),
  avatar_url text,
  active boolean not null default true,
  must_change_password boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists users_business_idx on users(business_id);
create index if not exists users_auth_idx on users(auth_id);

-- Helpers used by every policy
create or replace function app_business_id() returns uuid
language sql stable security definer set search_path = public as
$$ select business_id from users where auth_id = auth.uid() limit 1 $$;

create or replace function app_role() returns text
language sql stable security definer set search_path = public as
$$ select role from users where auth_id = auth.uid() limit 1 $$;

create or replace function has_role(roles text[]) returns boolean
language sql stable as
$$ select app_role() = any(roles) $$;

-- ---------------------------------------------------------------------------
-- CRM
-- ---------------------------------------------------------------------------

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  company text,
  phone text,
  email text,
  address text,
  city text,
  country text,
  tags jsonb not null default '[]',
  notes text,
  total_spend numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  company text,
  email text,
  phone text,
  source text not null default 'other',
  status text not null default 'new'
    check (status in ('new','contacted','qualified','converted','lost')),
  owner_id uuid references users(id) on delete set null,
  notes text,
  follow_up_date date,
  created_at timestamptz not null default now()
);

create table if not exists deals (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  lead_id uuid references leads(id) on delete set null,
  title text not null,
  value numeric not null default 0,
  stage text not null default 'qualified'
    check (stage in ('qualified','proposal','negotiation','won','lost')),
  owner_id uuid references users(id) on delete set null,
  expected_close date,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Inventory
-- ---------------------------------------------------------------------------

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null
);

create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  contact_name text,
  phone text,
  email text,
  city text
);

create table if not exists warehouses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  location text
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,
  supplier_id uuid references suppliers(id) on delete set null,
  warehouse_id uuid references warehouses(id) on delete set null,
  name text not null,
  sku text not null,
  barcode text,
  description text,
  price numeric not null default 0,
  cost numeric not null default 0,
  stock_qty int not null default 0,
  low_stock_threshold int not null default 5,
  created_at timestamptz not null default now()
);
create index if not exists products_business_idx on products(business_id);

create table if not exists stock_movements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  warehouse_id uuid references warehouses(id) on delete set null,
  type text not null check (type in ('in','out','adjustment')),
  qty int not null,
  reason text not null default '',
  reference text,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists purchase_orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  supplier_id uuid not null references suppliers(id) on delete cascade,
  status text not null default 'draft'
    check (status in ('draft','sent','received','cancelled')),
  items jsonb not null default '[]',
  total numeric not null default 0,
  expected_date date,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Sales & finance
-- ---------------------------------------------------------------------------

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  status text not null default 'new'
    check (status in ('new','processing','completed','cancelled')),
  total numeric not null default 0,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists orders_business_created_idx on orders(business_id, created_at);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  qty int not null default 1,
  price numeric not null default 0
);

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  order_id uuid references orders(id) on delete set null,
  customer_id uuid not null references customers(id) on delete cascade,
  number text not null,
  type text not null default 'invoice' check (type in ('invoice','quotation')),
  status text not null default 'draft'
    check (status in ('draft','sent','paid','partial','overdue')),
  issue_date date not null default current_date,
  due_date date not null default current_date + 7,
  subtotal numeric not null default 0,
  tax_rate numeric not null default 18,
  tax_amount numeric not null default 0,
  total numeric not null default 0,
  amount_paid numeric not null default 0,
  notes text,
  pdf_url text,
  created_at timestamptz not null default now()
);
create index if not exists invoices_business_idx on invoices(business_id, created_at);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  invoice_id uuid not null references invoices(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  amount numeric not null,
  method text not null default 'upi' check (method in ('cash','upi','bank','card')),
  reference text,
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  category text not null default 'Other',
  vendor text,
  description text not null default '',
  amount numeric not null,
  tax_amount numeric not null default 0,
  date date not null default current_date,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- HR
-- ---------------------------------------------------------------------------

create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  name text not null,
  email text,
  phone text,
  department text not null default 'General',
  designation text not null default '',
  salary numeric not null default 0,
  join_date date not null default current_date,
  status text not null default 'active' check (status in ('active','on_leave','exited')),
  performance_notes text,
  created_at timestamptz not null default now()
);

create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  date date not null,
  status text not null default 'present'
    check (status in ('present','absent','half_day','leave','remote')),
  check_in text,
  check_out text,
  unique (employee_id, date)
);

create table if not exists leave_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  type text not null default 'casual' check (type in ('casual','sick','earned','unpaid')),
  from_date date not null,
  to_date date not null,
  reason text not null default '',
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  decided_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists payroll (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  month text not null,
  gross numeric not null default 0,
  deductions numeric not null default 0,
  net numeric not null default 0,
  status text not null default 'draft' check (status in ('draft','paid')),
  paid_at timestamptz,
  unique (employee_id, month)
);

-- ---------------------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------------------

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  name text not null,
  description text,
  status text not null default 'planning'
    check (status in ('planning','active','on_hold','completed')),
  start_date date,
  due_date date,
  budget numeric,
  created_at timestamptz not null default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo','in_progress','review','done')),
  priority text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  assignee_id uuid references users(id) on delete set null,
  due_date date,
  order_index int not null default 0,
  comments jsonb not null default '[]',
  attachments jsonb not null default '[]',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Documents, knowledge base, notifications, audit
-- ---------------------------------------------------------------------------

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  type text not null default 'other'
    check (type in ('invoice','quotation','purchase_order','contract','report','meeting_notes','other')),
  related_type text,
  related_id uuid,
  file_url text,
  content text,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists knowledge_base_files (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  file_url text,
  mime_type text not null default 'application/pdf',
  size_bytes bigint not null default 0,
  extracted_text text,
  embedding vector(768),
  status text not null default 'processing' check (status in ('processing','ready','failed')),
  created_at timestamptz not null default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  title text not null,
  body text not null default '',
  type text not null default 'info' check (type in ('info','success','warning','alert')),
  read boolean not null default false,
  link text,
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  user_name text not null default '',
  action text not null,
  entity_type text not null,
  entity_id text,
  detail text not null default '',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Realtime + storage
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table products;
alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table invoices;
alter publication supabase_realtime add table notifications;

insert into storage.buckets (id, name, public) values
  ('logos', 'logos', true),
  ('documents', 'documents', false),
  ('knowledge-base', 'knowledge-base', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Reads: any member of the business. Writes: role lists below; viewer never.
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
  -- table => roles allowed to write
  write_roles jsonb := '{
    "customers":        ["owner","admin","manager","sales"],
    "leads":            ["owner","admin","manager","sales"],
    "deals":            ["owner","admin","manager","sales"],
    "categories":       ["owner","admin","manager"],
    "suppliers":        ["owner","admin","manager"],
    "warehouses":       ["owner","admin","manager"],
    "products":         ["owner","admin","manager","employee"],
    "stock_movements":  ["owner","admin","manager","employee"],
    "purchase_orders":  ["owner","admin","manager"],
    "orders":           ["owner","admin","manager","sales"],
    "order_items":      ["owner","admin","manager","sales"],
    "invoices":         ["owner","admin","manager","finance","sales"],
    "payments":         ["owner","admin","finance"],
    "expenses":         ["owner","admin","finance"],
    "employees":        ["owner","admin","hr"],
    "attendance":       ["owner","admin","hr"],
    "leave_requests":   ["owner","admin","hr","manager","employee","finance","sales"],
    "payroll":          ["owner","admin","hr"],
    "projects":         ["owner","admin","manager"],
    "tasks":            ["owner","admin","manager","employee","sales","finance","hr"],
    "documents":        ["owner","admin","manager","finance","hr"],
    "knowledge_base_files": ["owner","admin","manager"],
    "notifications":    ["owner","admin","manager","finance","sales","hr","employee"],
    "audit_logs":       ["owner","admin","manager","finance","sales","hr","employee"]
  }';
  -- Read is member-wide by default. These tables hold sensitive HR/payroll data
  -- (salaries), so their SELECT is restricted by role too — this is what backs
  -- the FAQ promise that Finance cannot access HR/payroll, at the DB level.
  read_roles jsonb := '{
    "employees":        ["owner","admin","hr"],
    "payroll":          ["owner","admin","hr"]
  }';
  roles text[];
  rroles text[];
begin
  -- businesses: members read their own; only owner/admin update
  execute 'alter table businesses enable row level security';
  execute 'create policy biz_read on businesses for select using (id = app_business_id())';
  execute 'create policy biz_update on businesses for update using (id = app_business_id() and has_role(array[''owner'',''admin''])) with check (id = app_business_id())';
  execute 'create policy biz_insert on businesses for insert with check (auth.uid() is not null)';

  -- users: members read their org; owner/admin manage
  execute 'alter table users enable row level security';
  execute 'create policy users_read on users for select using (business_id = app_business_id())';
  execute 'create policy users_write on users for all using (business_id = app_business_id() and has_role(array[''owner'',''admin''])) with check (business_id = app_business_id())';
  execute 'create policy users_self_insert on users for insert with check (auth_id = auth.uid())';

  for t in select jsonb_object_keys(write_roles) loop
    roles := array(select jsonb_array_elements_text(write_roles->t));
    execute format('alter table %I enable row level security', t);
    if read_roles ? t then
      rroles := array(select jsonb_array_elements_text(read_roles->t));
      execute format(
        'create policy %I on %I for select using (business_id = app_business_id() and has_role(%L::text[]))',
        t || '_read', t, rroles);
    else
      execute format(
        'create policy %I on %I for select using (business_id = app_business_id())',
        t || '_read', t);
    end if;
    execute format(
      'create policy %I on %I for insert with check (business_id = app_business_id() and has_role(%L::text[]))',
      t || '_insert', t, roles);
    execute format(
      'create policy %I on %I for update using (business_id = app_business_id() and has_role(%L::text[])) with check (business_id = app_business_id())',
      t || '_update', t, roles);
    execute format(
      'create policy %I on %I for delete using (business_id = app_business_id() and has_role(%L::text[]))',
      t || '_delete', t, roles);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Self-service overrides for the HR flows. The generated policies above give
-- attendance/leave writes to HR roles only; these refine them so an employee
-- can clock in/out and submit leave for THEIR OWN record — without being able
-- to touch anyone else's or approve their own leave.
-- ---------------------------------------------------------------------------

create or replace function app_user_id() returns uuid
language sql stable security definer set search_path = public as
$$ select id from users where auth_id = auth.uid() limit 1 $$;

create or replace function owns_employee(emp uuid) returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from employees e where e.id = emp and e.user_id = app_user_id()) $$;

-- employees: owner/admin/hr read all; a user may also read their OWN record so
-- self-service can resolve it. Other people's salaries stay hidden.
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

-- leave_requests: an employee may submit their own; only owner/admin/hr/manager
-- may decide (update) or delete — so no one approves their own leave.
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

-- Atomic stock decrement that refuses oversell
create or replace function decrement_stock(p_id uuid, p_qty int) returns int
language plpgsql as $$
declare new_qty int;
begin
  update products set stock_qty = stock_qty - p_qty
   where id = p_id and stock_qty >= p_qty
   returning stock_qty into new_qty;
  if new_qty is null then raise exception 'insufficient stock'; end if;
  return new_qty;
end $$;
