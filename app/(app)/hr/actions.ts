"use server";

import { revalidatePath } from "next/cache";
import { getSession, canWrite } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function decideLeave(id: string, decision: "approved" | "rejected") {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not signed in." };
  if (!canWrite(session.user.role, "leave_requests") || !["owner", "admin", "hr", "manager"].includes(session.user.role)) {
    return { ok: false, error: "Only HR or a manager can decide leave." };
  }
  const db = getDb();
  const { error } = await db
    .from("leave_requests")
    .update({ status: decision, decided_by: session.user.id })
    .eq("id", id)
    .eq("business_id", session.business.id);
  if (error) return { ok: false, error: error.message };
  await db.from("audit_logs").insert({
    business_id: session.business.id,
    user_id: session.user.id,
    user_name: session.user.name,
    action: decision === "approved" ? "approved" : "rejected",
    entity_type: "leave_request",
    entity_id: id,
    detail: `${decision === "approved" ? "Approved" : "Rejected"} a leave request`,
  });
  revalidatePath("/hr");
  return { ok: true };
}

export async function runPayroll(month: string) {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not signed in." };
  if (!canWrite(session.user.role, "payroll")) return { ok: false, error: "Your role can't run payroll." };
  const db = getDb();
  const { data: rows } = await db.from("payroll").select("*").eq("business_id", session.business.id).eq("month", month);
  let count = 0;
  for (const p of (rows ?? []).filter((r: any) => r.status !== "paid")) {
    await db.from("payroll").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", p.id);
    count++;
  }
  await db.from("audit_logs").insert({
    business_id: session.business.id, user_id: session.user.id, user_name: session.user.name,
    action: "processed", entity_type: "payroll", entity_id: null, detail: `Marked ${count} payslips paid for ${month}`,
  });
  revalidatePath("/hr");
  return { ok: true, count };
}
