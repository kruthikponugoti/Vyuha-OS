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
