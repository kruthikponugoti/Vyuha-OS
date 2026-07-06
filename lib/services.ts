// Business operations shared by the Copilot and the module UIs. Each writes to
// the real database, records an audit entry, and raises notifications where it
// matters. Permission is checked against the actor's role (mirrors RLS).

import { getDb } from "./db";
import { all } from "./data";
import { canWrite } from "./auth";
import type {
  Role, Customer, Product, Invoice, Order, Payment, Lead,
} from "./types";

export interface Actor {
  businessId: string;
  userId: string | null;
  userName: string;
  role: Role;
}

export class ServiceError extends Error {}

function ensure(actor: Actor, table: string) {
  if (!canWrite(actor.role, table)) {
    throw new ServiceError(
      `Your role (${actor.role}) can't modify ${table.replace(/_/g, " ")}. Ask an owner or admin.`
    );
  }
}

async function audit(
  actor: Actor,
  action: string,
  entityType: string,
  entityId: string | null,
  detail: string
) {
  await getDb().from("audit_logs").insert({
    business_id: actor.businessId,
    user_id: actor.userId,
    user_name: actor.userName,
    action,
    entity_type: entityType,
    entity_id: entityId,
    detail,
  });
}

async function notify(
  actor: Actor,
  title: string,
  body: string,
  type: "info" | "success" | "warning" | "alert",
  link: string | null
) {
  await getDb().from("notifications").insert({
    business_id: actor.businessId,
    user_id: null,
    title,
    body,
    type,
    read: false,
    link,
  });
}

// ---- fuzzy resolvers -------------------------------------------------------

export async function resolveCustomer(businessId: string, name: string): Promise<Customer | null> {
  const customers = await all("customers", businessId);
  const q = name.trim().toLowerCase();
  if (!q) return null;
  return (
    customers.find((c) => c.name.toLowerCase() === q) ||
    customers.find((c) => c.company?.toLowerCase() === q) ||
    customers.find((c) => c.name.toLowerCase().includes(q) || c.company?.toLowerCase().includes(q)) ||
    customers.find((c) => q.includes(c.name.toLowerCase().split(" ")[0])) ||
    null
  );
}

export async function resolveProduct(businessId: string, name: string): Promise<Product | null> {
  const products = await all("products", businessId);
  const q = name.trim().toLowerCase();
  if (!q) return null;
  const strip = (s: string) => s.replace(/s\b/g, "");
  return (
    products.find((p) => p.name.toLowerCase() === q) ||
    products.find((p) => p.sku.toLowerCase() === q) ||
    products.find((p) => p.name.toLowerCase().includes(q)) ||
    products.find((p) => q.includes(p.name.toLowerCase())) ||
    products.find((p) => {
      const name = strip(p.name.toLowerCase());
      const tokens = strip(q).split(/\s+/).filter((t) => t.length > 2);
      return tokens.length > 0 && tokens.every((t) => name.includes(t));
    }) ||
    products.find((p) => {
      const nameTokens = p.name.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
      const hits = nameTokens.filter((t) => strip(q).includes(strip(t)));
      return nameTokens.length >= 2 && hits.length >= nameTokens.length - 1;
    }) ||
    null
  );
}

let invoiceCounter = 0;
async function nextInvoiceNumber(businessId: string, type: "invoice" | "quotation") {
  const invoices = await all("invoices", businessId);
  const prefix = type === "quotation" ? "QUO" : "INV";
  const year = new Date().getFullYear();
  const nums = invoices
    .filter((i) => i.number.startsWith(prefix))
    .map((i) => parseInt(i.number.split("-").pop() || "0", 10));
  const next = Math.max(0, ...nums, invoiceCounter) + 1;
  invoiceCounter = next;
  return `${prefix}-${year}-${String(next).padStart(4, "0")}`;
}

// ---- customers -------------------------------------------------------------

export async function createCustomer(
  actor: Actor,
  input: { name: string; company?: string; phone?: string; email?: string; city?: string; address?: string; tags?: string[]; notes?: string }
) {
  ensure(actor, "customers");
  if (!input.name?.trim()) throw new ServiceError("A customer name is required.");
  const { data, error } = await getDb()
    .from("customers")
    .insert({
      business_id: actor.businessId,
      name: input.name.trim(),
      company: input.company ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      city: input.city ?? null,
      address: input.address ?? null,
      country: "India",
      tags: input.tags ?? [],
      notes: input.notes ?? null,
      total_spend: 0,
    })
    .select()
    .single();
  if (error) throw new ServiceError(error.message);
  const customer = data as Customer;
  await audit(actor, "created", "customer", customer.id, `Added customer ${customer.name}`);
  return customer;
}

export async function searchCustomers(businessId: string, query: string) {
  const customers = await all("customers", businessId);
  const q = query.trim().toLowerCase();
  const matched = q
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.company?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.phone?.includes(q) ||
          c.city?.toLowerCase().includes(q)
      )
    : customers;
  return matched.slice(0, 10);
}

// ---- stock -----------------------------------------------------------------

export async function checkStock(businessId: string, productName: string) {
  const product = await resolveProduct(businessId, productName);
  if (!product) return { found: false as const, query: productName };
  return {
    found: true as const,
    product,
    low_stock: product.stock_qty <= product.low_stock_threshold,
  };
}

export async function updateStock(
  actor: Actor,
  productName: string,
  qtyChange: number,
  reason = "Manual adjustment"
) {
  ensure(actor, "products");
  const product = await resolveProduct(actor.businessId, productName);
  if (!product) throw new ServiceError(`No product matching "${productName}".`);
  const newQty = product.stock_qty + qtyChange;
  if (newQty < 0) throw new ServiceError(`Can't reduce ${product.name} below zero (have ${product.stock_qty}).`);

  await getDb().from("products").update({ stock_qty: newQty }).eq("id", product.id);
  await getDb().from("stock_movements").insert({
    business_id: actor.businessId,
    product_id: product.id,
    warehouse_id: product.warehouse_id,
    type: qtyChange >= 0 ? "in" : "out",
    qty: Math.abs(qtyChange),
    reason,
    reference: null,
    created_by: actor.userId,
  });
  await audit(actor, "updated", "product", product.id, `Stock ${qtyChange >= 0 ? "+" : ""}${qtyChange} for ${product.name} (${reason})`);

  if (newQty <= product.low_stock_threshold) {
    await notify(actor, `Low stock: ${product.name}`, `Only ${newQty} left — below the reorder point of ${product.low_stock_threshold}.`, "warning", "/inventory");
  }
  return { product: { ...product, stock_qty: newQty }, previous: product.stock_qty, newQty };
}

// ---- invoices & quotations -------------------------------------------------

async function buildLines(
  businessId: string,
  items: { product_name: string; qty: number }[]
) {
  const lines: { product: Product; qty: number }[] = [];
  for (const item of items) {
    const product = await resolveProduct(businessId, item.product_name);
    if (!product) throw new ServiceError(`No product matching "${item.product_name}".`);
    const qty = Math.max(1, Math.floor(Number(item.qty) || 1));
    lines.push({ product, qty });
  }
  if (!lines.length) throw new ServiceError("No items provided.");
  return lines;
}

export async function createInvoiceDoc(
  actor: Actor,
  input: { customer_name: string; items: { product_name: string; qty: number }[]; type?: "invoice" | "quotation"; taxRate?: number; orderId?: string | null }
) {
  ensure(actor, "invoices");
  const type = input.type ?? "invoice";
  const customer = await resolveCustomer(actor.businessId, input.customer_name);
  if (!customer) throw new ServiceError(`No customer named "${input.customer_name}".`);
  const lines = await buildLines(actor.businessId, input.items);

  const total = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
  const taxRate = input.taxRate ?? 18;
  const subtotal = Math.round(total / (1 + taxRate / 100));
  const number = await nextInvoiceNumber(actor.businessId, type);
  const now = new Date();
  const due = new Date(now.getTime() + 7 * 86400000);

  const { data, error } = await getDb()
    .from("invoices")
    .insert({
      business_id: actor.businessId,
      order_id: input.orderId ?? null,
      customer_id: customer.id,
      number,
      type,
      status: type === "quotation" ? "draft" : "sent",
      issue_date: now.toISOString().slice(0, 10),
      due_date: due.toISOString().slice(0, 10),
      subtotal,
      tax_rate: taxRate,
      tax_amount: total - subtotal,
      total,
      amount_paid: 0,
      notes: null,
      pdf_url: null,
    })
    .select()
    .single();
  if (error) throw new ServiceError(error.message);
  const invoice = data as Invoice;

  await audit(actor, "created", type, invoice.id, `Created ${type} ${number} for ${customer.name} — ₹${total.toLocaleString("en-IN")}`);
  await notify(actor, `${type === "quotation" ? "Quotation" : "Invoice"} created`, `${number} for ${customer.name}, ₹${total.toLocaleString("en-IN")}.`, "info", "/finance/invoices");

  return {
    invoice,
    customer,
    line_items: lines.map((l) => ({
      product_name: l.product.name,
      qty: l.qty,
      price: l.product.price,
      subtotal: l.product.price * l.qty,
    })),
  };
}

// ---- payments --------------------------------------------------------------

export async function recordPayment(
  actor: Actor,
  input: { invoiceRef: string; amount?: number; method?: Payment["method"] }
) {
  ensure(actor, "payments");
  const invoices = await all("invoices", actor.businessId);
  const ref = input.invoiceRef.trim().toLowerCase();
  const invoice = invoices.find(
    (i) => i.number.toLowerCase() === ref || i.id === input.invoiceRef || i.number.toLowerCase().includes(ref)
  );
  if (!invoice) throw new ServiceError(`No invoice matching "${input.invoiceRef}".`);
  if (invoice.type === "quotation") throw new ServiceError(`${invoice.number} is a quotation, not an invoice.`);

  const outstanding = invoice.total - invoice.amount_paid;
  if (outstanding <= 0) throw new ServiceError(`${invoice.number} is already fully paid.`);
  const amount = Math.min(input.amount ?? outstanding, outstanding);

  await getDb().from("payments").insert({
    business_id: actor.businessId,
    invoice_id: invoice.id,
    customer_id: invoice.customer_id,
    amount,
    method: input.method ?? "upi",
    reference: null,
    paid_at: new Date().toISOString(),
  });
  const newPaid = invoice.amount_paid + amount;
  const status = newPaid >= invoice.total ? "paid" : "partial";
  await getDb().from("invoices").update({ amount_paid: newPaid, status }).eq("id", invoice.id);

  // bump customer spend
  const customer = (await all("customers", actor.businessId)).find((c) => c.id === invoice.customer_id);
  if (customer) {
    await getDb().from("customers").update({ total_spend: customer.total_spend + amount }).eq("id", customer.id);
  }

  await audit(actor, "recorded", "payment", invoice.id, `Recorded ₹${amount.toLocaleString("en-IN")} against ${invoice.number}`);
  await notify(actor, "Payment received", `₹${amount.toLocaleString("en-IN")} recorded against ${invoice.number}.`, "success", "/finance/payments");

  return { invoice: { ...invoice, amount_paid: newPaid, status }, amount, fullyPaid: status === "paid", customerName: customer?.name };
}

export async function sendPaymentReminder(actor: Actor, customerName: string) {
  const customer = await resolveCustomer(actor.businessId, customerName);
  if (!customer) throw new ServiceError(`No customer named "${customerName}".`);
  const invoices = await all("invoices", actor.businessId);
  const unpaid = invoices.filter(
    (i) => i.customer_id === customer.id && i.type === "invoice" && i.status !== "paid"
  );
  if (!unpaid.length) return { customer, unpaid: [], drafted: null, dueTotal: 0 };

  const dueTotal = unpaid.reduce((s, i) => s + (i.total - i.amount_paid), 0);
  const draft = `Hi ${customer.name.split(" ")[0]}, a friendly reminder that ${
    unpaid.length === 1 ? `invoice ${unpaid[0].number} is` : `${unpaid.length} invoices totalling ₹${dueTotal.toLocaleString("en-IN")} are`
  } due. You can pay by UPI or bank transfer at your convenience. Thank you — Vyuha Home Store.`;

  await audit(actor, "drafted", "reminder", customer.id, `Drafted payment reminder for ${customer.name} (₹${dueTotal.toLocaleString("en-IN")})`);
  await notify(actor, "Payment reminder drafted", `Reminder ready for ${customer.name} — ₹${dueTotal.toLocaleString("en-IN")} outstanding.`, "info", "/finance/invoices");

  return { customer, unpaid, drafted: draft, dueTotal };
}

// ---- full order workflow ---------------------------------------------------

export interface OrderStep {
  label: string;
  status: "done" | "failed";
}

export async function createOrderWorkflow(
  actor: Actor,
  input: { customer_name: string; items: { product_name: string; qty: number }[] }
) {
  ensure(actor, "orders");
  const steps: OrderStep[] = [];

  const customer = await resolveCustomer(actor.businessId, input.customer_name);
  if (!customer) throw new ServiceError(`No customer named "${input.customer_name}".`);

  // 1. validate stock
  const lines = await buildLines(actor.businessId, input.items);
  for (const l of lines) {
    if (l.product.stock_qty < l.qty) {
      steps.push({ label: `Checked inventory — ${l.product.name} is short (${l.product.stock_qty} left)`, status: "failed" });
      throw new ServiceError(`Only ${l.product.stock_qty} × ${l.product.name} in stock — can't fulfil ${l.qty}.`);
    }
  }
  steps.push({
    label: `Checked inventory — ${lines.map((l) => `${l.qty} × ${l.product.name}`).join(", ")} available`,
    status: "done",
  });

  // 2. decrement inventory
  const stockAfter: { name: string; remaining: number }[] = [];
  for (const l of lines) {
    const remaining = l.product.stock_qty - l.qty;
    await getDb().from("products").update({ stock_qty: remaining }).eq("id", l.product.id);
    await getDb().from("stock_movements").insert({
      business_id: actor.businessId,
      product_id: l.product.id,
      warehouse_id: l.product.warehouse_id,
      type: "out",
      qty: l.qty,
      reason: "Order fulfilment",
      reference: null,
      created_by: actor.userId,
    });
    stockAfter.push({ name: l.product.name, remaining });
    if (remaining <= l.product.low_stock_threshold) {
      await notify(actor, `Low stock: ${l.product.name}`, `Only ${remaining} left after this order.`, "warning", "/inventory");
    }
  }
  steps.push({ label: `Updated stock — ${stockAfter.map((s) => `${s.name} now ${s.remaining}`).join(", ")}`, status: "done" });

  // 3. create order + items
  const total = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
  const { data: orderData, error: orderErr } = await getDb()
    .from("orders")
    .insert({
      business_id: actor.businessId,
      customer_id: customer.id,
      status: "processing",
      total,
      created_by: actor.userId,
    })
    .select()
    .single();
  if (orderErr) throw new ServiceError(orderErr.message);
  const order = orderData as Order;
  for (const l of lines) {
    await getDb().from("order_items").insert({
      business_id: actor.businessId,
      order_id: order.id,
      product_id: l.product.id,
      qty: l.qty,
      price: l.product.price,
    });
  }
  steps.push({ label: `Created order for ${customer.name} — ₹${total.toLocaleString("en-IN")}`, status: "done" });

  // 4. invoice
  const { invoice } = await createInvoiceDoc(actor, {
    customer_name: customer.name,
    items: input.items,
    type: "invoice",
    orderId: order.id,
  });
  steps.push({ label: `Generated invoice ${invoice.number}`, status: "done" });

  // 5. update customer record (activity/notes touch) + notification queue
  await audit(actor, "created", "order", order.id, `Recorded order for ${customer.name} — ₹${total.toLocaleString("en-IN")}`);
  const draft = `Hi ${customer.name.split(" ")[0]}, your order for ${lines.map((l) => `${l.qty} × ${l.product.name}`).join(", ")} is confirmed. Total ₹${total.toLocaleString("en-IN")}. Invoice ${invoice.number} to follow. — Vyuha Home Store`;
  steps.push({ label: "Drafted customer confirmation (not sent)", status: "done" });

  await notify(actor, "New order recorded", `${customer.name} — ₹${total.toLocaleString("en-IN")} (${invoice.number}).`, "success", "/finance/invoices");

  return {
    order,
    invoice,
    customer,
    total,
    line_items: lines.map((l) => ({ product_name: l.product.name, qty: l.qty, price: l.product.price, subtotal: l.product.price * l.qty })),
    stock_after: stockAfter,
    notification_draft: draft,
    steps,
  };
}

// ---- leads (used by CRM + copilot search) ----------------------------------

export async function createLead(
  actor: Actor,
  input: { name: string; company?: string; email?: string; phone?: string; source?: string }
) {
  ensure(actor, "leads");
  if (!input.name?.trim()) throw new ServiceError("A lead name is required.");
  const { data, error } = await getDb()
    .from("leads")
    .insert({
      business_id: actor.businessId,
      name: input.name.trim(),
      company: input.company ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      source: input.source ?? "other",
      status: "new",
      owner_id: actor.userId,
      notes: null,
    })
    .select()
    .single();
  if (error) throw new ServiceError(error.message);
  const lead = data as Lead;
  await audit(actor, "created", "lead", lead.id, `Added lead ${lead.name}`);
  return lead;
}

export function actorFromSession(session: {
  business: { id: string };
  user: { id: string; name: string; role: Role };
}): Actor {
  return {
    businessId: session.business.id,
    userId: session.user.id,
    userName: session.user.name,
    role: session.user.role,
  };
}
