// Read queries that back the Copilot's cross-module questions (unpaid invoices,
// expenses, attendance, leave, project status). All business-scoped; the "my_*"
// ones additionally scope to a single user.

import { all, startOfToday, startOfMonth, sum, isSameDay } from "@/lib/data";
import type {
  Invoice, Expense, Employee, Attendance, LeaveRequest, Project, Task, Customer,
} from "@/lib/types";

// Standard annual leave allocations (used for "leaves left").
const LEAVE_ALLOWANCE: Record<string, number> = { casual: 12, sick: 6, earned: 15 };

export async function listUnpaidInvoices(businessId: string) {
  const [invoices, customers] = await Promise.all([all("invoices", businessId), all("customers", businessId)]);
  const name = new Map(customers.map((c: Customer) => [c.id, c.name]));
  const unpaid = (invoices as Invoice[])
    .filter((i) => i.type === "invoice" && i.status !== "paid")
    .map((i) => ({
      number: i.number,
      customer: name.get(i.customer_id) ?? "Unknown",
      due: i.total - i.amount_paid,
      status: i.status,
      due_date: i.due_date,
    }))
    .sort((a, b) => b.due - a.due);
  return { count: unpaid.length, total: sum(unpaid, (u) => u.due), invoices: unpaid.slice(0, 12) };
}

export async function expenseSummary(businessId: string) {
  const expenses = await all("expenses", businessId);
  const monthStart = startOfMonth();
  const month = (expenses as Expense[]).filter((e) => new Date(e.date) >= monthStart);
  const byCat: Record<string, number> = {};
  for (const e of month) byCat[e.category] = (byCat[e.category] || 0) + e.amount;
  const categories = Object.entries(byCat).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  return { total: sum(month, (e) => e.amount), count: month.length, categories };
}

export async function attendanceToday(businessId: string) {
  const [employees, attendance] = await Promise.all([all("employees", businessId), all("attendance", businessId)]);
  const today = startOfToday();
  const byEmp = new Map<string, string>();
  for (const a of attendance as Attendance[]) if (isSameDay(a.date, today)) byEmp.set(a.employee_id, a.status);
  const rows = (employees as Employee[]).map((e) => ({ name: e.name, status: byEmp.get(e.id) ?? "not marked" }));
  const tally: Record<string, number> = {};
  for (const r of rows) tally[r.status] = (tally[r.status] || 0) + 1;
  return {
    date: today.toISOString().slice(0, 10),
    present: rows.filter((r) => r.status === "present" || r.status === "remote"),
    absent: rows.filter((r) => r.status === "absent"),
    on_leave: rows.filter((r) => r.status === "leave"),
    half_day: rows.filter((r) => r.status === "half_day"),
    tally,
    total: rows.length,
  };
}

function leaveBalanceFor(empId: string, leaves: LeaveRequest[]) {
  const year = new Date().getFullYear();
  const taken: Record<string, number> = { casual: 0, sick: 0, earned: 0, unpaid: 0 };
  for (const l of leaves) {
    if (l.employee_id !== empId || l.status !== "approved") continue;
    if (new Date(l.from_date).getFullYear() !== year) continue;
    const days = Math.max(1, Math.round((new Date(l.to_date).getTime() - new Date(l.from_date).getTime()) / 86400000) + 1);
    taken[l.type] = (taken[l.type] || 0) + days;
  }
  return Object.keys(LEAVE_ALLOWANCE).map((type) => ({
    type,
    allowance: LEAVE_ALLOWANCE[type],
    taken: taken[type] || 0,
    left: Math.max(0, LEAVE_ALLOWANCE[type] - (taken[type] || 0)),
  }));
}

export async function employeeLeave(businessId: string, employeeName: string) {
  const [employees, leaves] = await Promise.all([all("employees", businessId), all("leave_requests", businessId)]);
  const q = employeeName.trim().toLowerCase();
  const emp = (employees as Employee[]).find(
    (e) => e.name.toLowerCase() === q || e.name.toLowerCase().includes(q) || q.includes(e.name.toLowerCase().split(" ")[0])
  );
  if (!emp) return { found: false as const, query: employeeName };
  const balance = leaveBalanceFor(emp.id, leaves as LeaveRequest[]);
  const pending = (leaves as LeaveRequest[]).filter((l) => l.employee_id === emp.id && l.status === "pending");
  return { found: true as const, employee: emp.name, balance, pending: pending.length };
}

export async function myAttendance(businessId: string, userId: string | null) {
  if (!userId) return { linked: false as const };
  const [employees, attendance, leaves] = await Promise.all([
    all("employees", businessId), all("attendance", businessId), all("leave_requests", businessId),
  ]);
  const emp = (employees as Employee[]).find((e) => e.user_id === userId);
  if (!emp) return { linked: false as const };
  const monthStart = startOfMonth();
  const mine = (attendance as Attendance[]).filter((a) => a.employee_id === emp.id && new Date(a.date) >= monthStart);
  const tally: Record<string, number> = {};
  for (const a of mine) tally[a.status] = (tally[a.status] || 0) + 1;
  const today = startOfToday();
  const todayRow = (attendance as Attendance[]).find((a) => a.employee_id === emp.id && isSameDay(a.date, today));
  return {
    linked: true as const,
    employee: emp.name,
    today: todayRow?.status ?? "not marked",
    check_in: todayRow?.check_in ?? null,
    check_out: todayRow?.check_out ?? null,
    present_this_month: (tally.present || 0) + (tally.remote || 0),
    absent_this_month: tally.absent || 0,
    balance: leaveBalanceFor(emp.id, leaves as LeaveRequest[]),
  };
}

export async function payrollSummary(businessId: string, month?: string) {
  const [payroll, employees] = await Promise.all([all("payroll", businessId), all("employees", businessId)]);
  const rows = payroll as any[];
  const months = [...new Set(rows.map((p) => p.month))].sort().reverse();
  const m = month && months.includes(month) ? month : months[0];
  const forMonth = rows.filter((p) => p.month === m);
  const empName = new Map(employees.map((e: Employee) => [e.id, e.name]));
  return {
    month: m ?? null,
    count: forMonth.length,
    gross: sum(forMonth, (p) => p.gross),
    net: sum(forMonth, (p) => p.net),
    paid: forMonth.filter((p) => p.status === "paid").length,
    unpaid: forMonth.filter((p) => p.status !== "paid").length,
    rows: forMonth.slice(0, 12).map((p) => ({ name: empName.get(p.employee_id) ?? "—", net: p.net, status: p.status })),
  };
}

export async function projectStatus(businessId: string) {
  const [projects, tasks] = await Promise.all([all("projects", businessId), all("tasks", businessId)]);
  const rows = (projects as Project[]).map((p) => {
    const pts = (tasks as Task[]).filter((t) => t.project_id === p.id);
    const done = pts.filter((t) => t.status === "done").length;
    return {
      name: p.name,
      status: p.status,
      tasks: pts.length,
      done,
      pct: pts.length ? Math.round((done / pts.length) * 100) : 0,
    };
  });
  return { count: rows.length, projects: rows.sort((a, b) => (a.status === "active" ? -1 : 1)) };
}
