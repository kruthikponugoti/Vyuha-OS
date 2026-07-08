-- Invoice items table: persists line items for every invoice/quotation so they
-- can be displayed on the detail page and in PDFs without depending on an
-- order_id link. Run this AFTER schema.sql.

create table if not exists invoice_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  invoice_id uuid not null references invoices(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  product_name text not null,
  qty int not null default 1,
  price numeric not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists invoice_items_invoice_idx on invoice_items(invoice_id);

-- RLS: same write rules as invoices
alter table invoice_items enable row level security;

create policy invoice_items_read on invoice_items for select
  using (business_id = app_business_id());

create policy invoice_items_insert on invoice_items for insert
  with check (business_id = app_business_id() and has_role(array['owner','admin','manager','finance','sales']));

create policy invoice_items_update on invoice_items for update
  using (business_id = app_business_id() and has_role(array['owner','admin','manager','finance','sales']))
  with check (business_id = app_business_id());

create policy invoice_items_delete on invoice_items for delete
  using (business_id = app_business_id() and has_role(array['owner','admin','manager','finance','sales']));
