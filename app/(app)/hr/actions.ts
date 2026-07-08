"use server";

import { revalidatePath } from "next/cache";
import { getSession, canWrite } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { all } from "@/lib/data";
import type { Attendance, Employee } from "@/lib/types";

const LATE_AFTER = "09:30"; // check-ins after this read as "late"

/** The employee record linked to the signed-in user, if any. */
async function myEmployee(businessId: string, userId: string) {
  const employees = await all("employees", businessId);
  return (employees as Employee[]).find((e) => e.user_id === userId) ?? null;
}

function nowHM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * One-tap clock in / clock out for the signed-in employee. First tap of the day
 * records check-in (present, or late after 09:30); second tap records check-out.
 */
export async function clockInOut() {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not signed in." };
  const emp = await myEmployee(session.business.id, session.user.id);
  if (!emp) return { ok: false, error: "Your account isn't linked to an employee record." };

  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const rows = await all("attendance", session.business.id);
  const existing = (rows as Attendance[]).find((a) => a.employee_id === emp.id && a.date === today);
  const time = nowHM();

  if (!existing || !existing.check_in) {
    // Clock IN
    const late = time > LATE_AFTER;
    if (existing) {
      await db.from("attendance").update({ check_in: time, status: "present" }).eq("id", existing.id);
    } else {
      await db.from("attendance").insert({
        business_id: session.business.id,
        employee_id: emp.id,
        date: today,
        status: "present",
        check_in: time,
        check_out: null,
      });
    }
    await db.from("audit_logs").insert({
      business_id: session.business.id, user_id: session.user.id, user_name: session.user.name,
      action: "clocked in", entity_type: "attendance", entity_id: emp.id, detail: `${emp.name} clocked in at ${time}${late ? " (late)" : ""}`,
    });
    revalidatePath("/dashboard");
    revalidatePath("/hr");
    return { ok: true, state: "in" as const, time, late };
  }

  if (!existing.check_out) {
    // Clock OUT
    await db.from("attendance").update({ check_out: time }).eq("id", existing.id);
    await db.from("audit_logs").insert({
      business_id: session.business.id, user_id: session.user.id, user_name: session.user.name,
      action: "clocked out", entity_type: "attendance", entity_id: emp.id, detail: `${emp.name} clocked out at ${time}`,
    });
    revalidatePath("/dashboard");
    revalidatePath("/hr");
    return { ok: true, state: "out" as const, time };
  }

  return { ok: false, error: "You've already clocked out today." };
}

/** Employee submits a leave request for their own record. */
export async function requestLeave(input: { type: string; from_date: string; to_date: string; reason: string }) {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not signed in." };
  const emp = await myEmployee(session.business.id, session.user.id);
  if (!emp) return { ok: false, error: "Your account isn't linked to an employee record." };
  if (!input.from_date || !input.to_date) return { ok: false, error: "Choose the leave dates." };
  if (input.to_date < input.from_date) return { ok: false, error: "The end date can't be before the start date." };

  const db = getDb();
  const { error } = await db.from("leave_requests").insert({
    business_id: session.business.id,
    employee_id: emp.id,
    type: input.type || "casual",
    from_date: input.from_date,
    to_date: input.to_date,
    reason: input.reason || "",
    status: "pending",
    decided_by: null,
  });
  if (error) return { ok: false, error: error.message };
  await db.from("notifications").insert({
    business_id: session.business.id, user_id: null,
    title: "Leave request submitted", body: `${emp.name} requested ${input.type} leave (${input.from_date} to ${input.to_date}).`,
    type: "info", read: false, link: "/hr",
  });
  await db.from("audit_logs").insert({
    business_id: session.business.id, user_id: session.user.id, user_name: session.user.name,
    action: "requested", entity_type: "leave_request", entity_id: emp.id, detail: `${emp.name} requested ${input.type} leave`,
  });
  revalidatePath("/dashboard");
  revalidatePath("/hr");
  return { ok: true };
}

export async function decideLeave(id: string, decision: "approved" | "rejected") {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not signed in." };
  if (!canWrite(session.user.role, "leave_requests") || !["owner", "admin", "hr", "manager"].includes(session.user.role)) {
    return { ok: false, error: "Only HR or a manager can decide leave." };
  }
  const db = getDb();
  const leave = (await all("leave_requests", session.business.id)).find((l) => l.id === id);
  const { error } = await db
    .from("leave_requests")
    .update({ status: decision, decided_by: session.user.id })
    .eq("id", id)
    .eq("business_id", session.business.id);
  if (error) return { ok: false, error: error.message };

  // Approved leave shows up in attendance (which feeds payroll) for each day.
  if (decision === "approved" && leave) {
    const existing = (await all("attendance", session.business.id)) as Attendance[];
    for (let d = new Date(leave.from_date); d <= new Date(leave.to_date); d.setDate(d.getDate() + 1)) {
      const date = d.toISOString().slice(0, 10);
      const row = existing.find((a) => a.employee_id === leave.employee_id && a.date === date);
      if (row) {
        await db.from("attendance").update({ status: "leave" }).eq("id", row.id);
      } else {
        await db.from("attendance").insert({
          business_id: session.business.id, employee_id: leave.employee_id, date,
          status: "leave", check_in: null, check_out: null,
        });
      }
    }
  }

  await db.from("notifications").insert({
    business_id: session.business.id, user_id: null,
    title: `Leave ${decision}`, body: `A leave request was ${decision} by ${session.user.name}.`,
    type: decision === "approved" ? "success" : "warning", read: false, link: "/hr",
  });
  await db.from("audit_logs").insert({
    business_id: session.business.id,
    user_id: session.user.id,
    user_name: session.user.name,
    action: decision,
    entity_type: "leave_request",
    entity_id: id,
    detail: `${decision === "approved" ? "Approved" : "Rejected"} a leave request`,
  });
  revalidatePath("/hr");
  revalidatePath("/dashboard");
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
