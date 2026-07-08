"use server";

// Generic, permission-checked CRUD used by every module. Each action resolves
// the session, enforces the role's write rights (mirrors RLS), writes the row,
// records an audit entry, and revalidates the page.

import { revalidatePath } from "next/cache";
import { getSession, canWrite } from "@/lib/auth";
import { getDb } from "@/lib/db";
import type { TableName } from "@/lib/types";

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

const LABEL: Partial<Record<TableName, string>> = {
  customers: "customer", leads: "lead", deals: "deal", products: "product",
  suppliers: "supplier", warehouses: "warehouse", categories: "category",
  purchase_orders: "purchase order", invoices: "invoice", expenses: "expense",
  employees: "employee", leave_requests: "leave request", projects: "project",
  tasks: "task", documents: "document", stock_movements: "stock movement",
};

async function logAudit(
  session: NonNullable<Awaited<ReturnType<typeof getSession>>>,
  action: string,
  table: string,
  id: string | null,
  detail: string
) {
  await getDb().from("audit_logs").insert({
    business_id: session.business.id,
    user_id: session.user.id,
    user_name: session.user.name,
    action,
    entity_type: table,
    entity_id: id,
    detail,
  });
}

export async function saveRecord(
  table: TableName,
  values: Record<string, any>,
  revalidate?: string
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not signed in." };
  if (!canWrite(session.user.role, table)) {
    return { ok: false, error: `Your role can't modify ${LABEL[table] ?? table}.` };
  }
  const db = getDb();
  const isUpdate = Boolean(values.id);
  const label = LABEL[table] ?? table;
  const name = values.name || values.title || values.number || "";

  try {
    if (isUpdate) {
      const { id, ...patch } = values;
      const { error } = await db.from(table).update(patch).eq("id", id).eq("business_id", session.business.id);
      if (error) return { ok: false, error: error.message };
      await logAudit(session, "updated", table, id, `Updated ${label} ${name}`.trim());
      if (revalidate) revalidatePath(revalidate);
      return { ok: true, id };
    }
    const { data, error } = await db
      .from(table)
      .insert({ ...values, business_id: session.business.id })
      .select()
      .single();
    if (error) return { ok: false, error: error.message };
    await logAudit(session, "created", table, data.id, `Created ${label} ${name}`.trim());
    if (revalidate) revalidatePath(revalidate);
    return { ok: true, id: data.id };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Save failed." };
  }
}

export async function deleteRecord(
  table: TableName,
  id: string,
  revalidate?: string
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not signed in." };
  if (!canWrite(session.user.role, table)) {
    return { ok: false, error: `Your role can't modify ${LABEL[table] ?? table}.` };
  }
  const db = getDb();
  try {
    const { error } = await db.from(table).delete().eq("id", id).eq("business_id", session.business.id);
    if (error) return { ok: false, error: error.message };
    await logAudit(session, "deleted", table, id, `Deleted ${LABEL[table] ?? table}`);
    if (revalidate) revalidatePath(revalidate);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Delete failed." };
  }
}

export async function importRecords(
  table: TableName,
  rows: Record<string, any>[],
  revalidate?: string
): Promise<ActionResult & { count?: number }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not signed in." };
  if (!canWrite(session.user.role, table)) {
    return { ok: false, error: `Your role can't modify ${LABEL[table] ?? table}.` };
  }
  const db = getDb();
  let count = 0;
  try {
    for (const row of rows) {
      const { error } = await db.from(table).insert({ ...row, business_id: session.business.id });
      if (!error) count++;
    }
    await logAudit(session, "imported", table, null, `Imported ${count} ${LABEL[table] ?? table} rows`);
    if (revalidate) revalidatePath(revalidate);
    return { ok: true, count };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Import failed.", count };
  }
}

export async function loadSampleDataAction(): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not signed in." };
  if (!["owner", "admin"].includes(session.user.role)) {
    return { ok: false, error: "Only owners and admins can load sample data." };
  }

  const db = getDb();
  
  // Verify if they already have products to prevent double seeding
  const { data: existingProducts } = await db.from("products").select("id").limit(1);
  if (existingProducts && existingProducts.length > 0) {
    return { ok: false, error: "Workspace is not empty. Cannot load sample data over existing records." };
  }

  try {
    const { buildSeedDatabase } = await import("@/lib/db/seed");
    const seed = buildSeedDatabase();
    const bid = session.business.id;

    // Helper to map business_id and insert
    const insertTable = async (table: string, rows: any[]) => {
      if (!rows || rows.length === 0) return;
      const mapped = rows.map(r => {
        const copy = { ...r, business_id: bid };
        if ("created_by" in copy && copy.created_by) copy.created_by = session.user.id;
        if ("user_id" in copy && table === "employees") copy.user_id = null; // don't map mock user IDs
        return copy;
      });
      const { error } = await db.from(table).insert(mapped);
      if (error) throw new Error(`${table} seeding failed: ${error.message}`);
    };

    // Insert in correct dependency order
    await insertTable("categories", seed.categories);
    await insertTable("suppliers", seed.suppliers);
    await insertTable("warehouses", seed.warehouses);
    await insertTable("products", seed.products);
    await insertTable("customers", seed.customers);
    await insertTable("leads", seed.leads);
    await insertTable("deals", seed.deals);
    await insertTable("orders", seed.orders);
    await insertTable("order_items", seed.order_items);
    await insertTable("invoices", seed.invoices);
    await insertTable("payments", seed.payments);
    await insertTable("expenses", seed.expenses);
    await insertTable("employees", seed.employees);
    await insertTable("attendance", seed.attendance);
    await insertTable("leave_requests", seed.leave_requests);
    await insertTable("payroll", seed.payroll);
    await insertTable("projects", seed.projects);
    await insertTable("tasks", seed.tasks);
    await insertTable("documents", seed.documents);
    await insertTable("knowledge_base_files", seed.knowledge_base_files);
    await insertTable("notifications", seed.notifications);
    await insertTable("audit_logs", seed.audit_logs);

    // Also populate invoice_items
    const invoiceItems: any[] = [];
    const prodMap = new Map(seed.products.map(p => [p.id, p]));
    for (const inv of seed.invoices) {
      if (inv.order_id) {
        const oItems = seed.order_items.filter(oi => oi.order_id === inv.order_id);
        for (const oi of oItems) {
          const prod = prodMap.get(oi.product_id);
          invoiceItems.push({
            business_id: bid,
            invoice_id: inv.id,
            product_id: oi.product_id,
            product_name: prod ? prod.name : "Item",
            qty: oi.qty,
            price: oi.price,
          });
        }
      } else {
        invoiceItems.push({
          business_id: bid,
          invoice_id: inv.id,
          product_id: null,
          product_name: inv.notes || "Goods & services",
          qty: 1,
          price: inv.subtotal,
        });
      }
    }
    const { error: iiError } = await db.from("invoice_items").insert(invoiceItems);
    if (iiError) throw new Error(`invoice_items seeding failed: ${iiError.message}`);

    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e: any) {
    console.error("Failed to load sample data:", e);
    return { ok: false, error: e.message || "Failed to load sample data." };
  }
}

