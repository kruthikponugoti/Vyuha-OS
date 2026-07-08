"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CrudTable } from "@/components/crud/crud-table";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { StatCard } from "@/components/shell/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { decideLeave, runPayroll } from "@/app/(app)/hr/actions";
import { inr, formatDate, titleCase, cn } from "@/lib/utils";
import { toast } from "sonner";
import { Check, X, Wallet, Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Employee, Attendance, LeaveRequest, Payroll } from "@/lib/types";
import type { ColumnDef, FieldDef } from "@/components/crud/types";

const ATT_TONE: Record<string, string> = {
  present: "bg-success", remote: "bg-primary", half_day: "bg-warning", leave: "bg-ink-300", absent: "bg-destructive",
};

function initials(n: string) { return n.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase(); }

export function HrView({
  employees, attendance, leave, payroll, empNames, canWriteEmployees, canDecideLeave, canRunPayroll,
}: {
  employees: Employee[];
  attendance: Attendance[];
  leave: LeaveRequest[];
  payroll: Payroll[];
  empNames: Record<string, string>;
  canWriteEmployees: boolean;
  canDecideLeave: boolean;
  canRunPayroll: boolean;
}) {
  const router = useRouter();
  const departments = [...new Set(employees.map((e) => e.department))];

  const employeeColumns: ColumnDef<Employee>[] = [
    { key: "name", header: "Employee", render: (r) => (
      <div className="flex items-center gap-2.5">
        <Avatar className="h-8 w-8"><AvatarFallback>{initials(r.name)}</AvatarFallback></Avatar>
        <div><div className="font-medium">{r.name}</div><div className="text-xs text-muted-foreground">{r.designation}</div></div>
      </div>
    ) },
    { key: "department", header: "Department", render: (r) => <Badge variant="muted">{r.department}</Badge> },
    { key: "email", header: "Contact", render: (r) => <span className="text-sm">{r.email ?? r.phone ?? "—"}</span> },
    { key: "salary", header: "Salary", className: "text-right", render: (r) => <span className="num">{inr(r.salary)}/mo</span> },
    { key: "status", header: "Status", render: (r) => <Badge variant={r.status === "active" ? "success" : r.status === "on_leave" ? "warning" : "muted"}>{titleCase(r.status)}</Badge> },
  ];
  const employeeFields: FieldDef[] = [
    { name: "name", label: "Full name", required: true, full: true },
    { name: "designation", label: "Designation", required: true },
    { name: "department", label: "Department", type: "select", options: ["Operations", "Finance", "Sales", "HR", "Support", "General"].map((v) => ({ value: v, label: v })), defaultValue: "Operations" },
    { name: "email", label: "Email", type: "email" },
    { name: "phone", label: "Phone", type: "tel" },
    { name: "salary", label: "Monthly salary (₹)", type: "number", required: true },
    { name: "join_date", label: "Join date", type: "date" },
    { name: "status", label: "Status", type: "select", options: ["active", "on_leave", "exited"].map((v) => ({ value: v, label: titleCase(v) })), defaultValue: "active" },
    { name: "performance_notes", label: "Performance notes", type: "textarea", full: true },
  ];

  // ---- attendance derived data ----
  const LATE_AFTER = "09:30";
  const isLate = (a?: Attendance) => !!a && a.status === "present" && !!a.check_in && a.check_in > LATE_AFTER;
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayByEmp = new Map(attendance.filter((a) => a.date === todayStr).map((a) => [a.employee_id, a]));
  const activeEmps = employees.filter((e) => e.status !== "exited");
  const todaySummary = {
    present: activeEmps.filter((e) => { const a = todayByEmp.get(e.id); return a && (a.status === "present" || a.status === "remote"); }),
    absent: activeEmps.filter((e) => todayByEmp.get(e.id)?.status === "absent"),
    leave: activeEmps.filter((e) => todayByEmp.get(e.id)?.status === "leave"),
    late: activeEmps.filter((e) => isLate(todayByEmp.get(e.id))),
  };

  // monthly register: pick a month, show a day grid with per-employee totals
  const attMonths = [...new Set(attendance.map((a) => a.date.slice(0, 7)))].sort().reverse();
  const [attMonth, setAttMonth] = React.useState(attMonths[0] ?? todayStr.slice(0, 7));
  const [ry, rm] = attMonth.split("-").map(Number);
  const daysInMonth = ry && rm ? new Date(ry, rm, 0).getDate() : 30;
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const attByEmpDay: Record<string, Record<string, Attendance>> = {};
  for (const a of attendance) (attByEmpDay[a.employee_id] ??= {})[a.date] = a;
  const dayKey = (d: number) => `${attMonth}-${String(d).padStart(2, "0")}`;
  const totalsFor = (empId: string) => {
    const rows = monthDays.map((d) => attByEmpDay[empId]?.[dayKey(d)]).filter(Boolean) as Attendance[];
    return {
      present: rows.filter((a) => a.status === "present" || a.status === "remote").length,
      absent: rows.filter((a) => a.status === "absent").length,
      leave: rows.filter((a) => a.status === "leave").length,
      late: rows.filter((a) => isLate(a)).length,
    };
  };

  const pendingLeave = leave.filter((l) => l.status === "pending");
  const months = [...new Set(payroll.map((p) => p.month))].sort().reverse();
  const [payMonth, setPayMonth] = React.useState(months[0] ?? "");
  const monthPayroll = payroll.filter((p) => p.month === payMonth);
  const unpaidCount = monthPayroll.filter((p) => p.status !== "paid").length;
  // attendance → payroll: days present/absent for the payroll month
  const payDays = (empId: string) => {
    const rows = Object.entries(attByEmpDay[empId] ?? {}).filter(([d]) => d.startsWith(payMonth)).map(([, a]) => a);
    return { present: rows.filter((a) => a.status === "present" || a.status === "remote").length, absent: rows.filter((a) => a.status === "absent").length };
  };

  async function decide(id: string, d: "approved" | "rejected") {
    const res = await decideLeave(id, d);
    if (res.ok) { toast.success(`Leave ${d}.`); router.refresh(); } else toast.error(res.error ?? "Failed.");
  }
  async function pay() {
    const res = await runPayroll(payMonth);
    if (res.ok) { toast.success(`Marked ${res.count} payslips paid.`); router.refresh(); } else toast.error(res.error ?? "Failed.");
  }

  function downloadAttendancePdf() {
    try {
      const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
      const W = pdf.internal.pageSize.getWidth();
      const M = 40;
      const ink = [27, 37, 89] as const;
      const muted = [120, 128, 150] as const;

      pdf.setFillColor(...ink);
      [0, 13].forEach((dx) => [0, 13].forEach((dy) => pdf.rect(M + dx, 40 + dy, 10, 10, "F")));
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(15);
      pdf.setTextColor(...ink);
      pdf.text("Vyuha OS — Attendance Register", M + 34, 56);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(...muted);
      pdf.text(`Period: ${attMonth} · Generated on ${formatDate(new Date())}`, M + 34, 70);

      const headers = ["Employee", ...monthDays.map(String), "P / A / L"];
      const rows = activeEmps.map((emp) => {
        const t = totalsFor(emp.id);
        const dayStatuses = monthDays.map((d) => {
          const a = attByEmpDay[emp.id]?.[dayKey(d)];
          if (!a) return "—";
          const late = isLate(a);
          switch (a.status) {
            case "present": return late ? "P(L)" : "P";
            case "remote": return "R";
            case "half_day": return "HD";
            case "leave": return "L";
            case "absent": return "A";
            default: return "—";
          }
        });
        return [
          emp.name,
          ...dayStatuses,
          `${t.present} / ${t.absent} / ${t.leave}${t.late > 0 ? ` (${t.late}L)` : ""}`,
        ];
      });

      autoTable(pdf, {
        startY: 90,
        head: [headers],
        body: rows,
        theme: "grid",
        headStyles: { fillColor: ink as any, textColor: [255, 255, 255], fontSize: 7, halign: "center" },
        bodyStyles: { fontSize: 7, cellPadding: 4, textColor: [40, 45, 70] },
        columnStyles: { 
          0: { halign: "left", fontStyle: "bold", fontSize: 8 } 
        },
        margin: { left: M, right: M },
      });

      pdf.save(`attendance-register-${attMonth}.pdf`);
      toast.success("Attendance register PDF downloaded.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF.");
    }
  }

  return (
    <Tabs defaultValue="employees" className="p-5 sm:p-8">
     <TabsList>
        <TabsTrigger value="employees">Employees ({employees.length})</TabsTrigger>
        <TabsTrigger value="attendance">Attendance</TabsTrigger>
        <TabsTrigger value="leave">Leave{pendingLeave.length > 0 ? ` (${pendingLeave.length})` : ""}</TabsTrigger>
        <TabsTrigger value="payroll">Payroll</TabsTrigger>
      </TabsList>

      <TabsContent value="employees">
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Headcount" value={employees.filter((e) => e.status !== "exited").length} sub="active employees" />
          <StatCard label="Departments" value={departments.length} />
          <StatCard label="Monthly payroll" value={inr(employees.filter((e) => e.status !== "exited").reduce((s, e) => s + e.salary, 0))} />
        </div>
        <CrudTable
          table="employees" rows={employees} columns={employeeColumns} fields={employeeFields}
          searchKeys={["name", "designation", "email"]}
          filters={[{ key: "department", label: "Department", options: departments.map((d) => ({ value: d, label: d })) }]}
          entityName="employee" revalidate="/hr" canWrite={canWriteEmployees} exportName="employees"
          serialize={(v) => ({ ...v, salary: Number(v.salary) || 0, join_date: v.join_date || new Date().toISOString().slice(0, 10) })}
        />
      </TabsContent>

      <TabsContent value="attendance" className="space-y-6">
        {/* Today at a glance */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Present today" value={todaySummary.present.length} sub={`of ${activeEmps.length}`} tone="success" />
          <StatCard label="Absent today" value={todaySummary.absent.length} sub={todaySummary.absent.map((e) => e.name.split(" ")[0]).join(", ") || "nobody"} tone={todaySummary.absent.length ? "danger" : "default"} />
          <StatCard label="Late today" value={todaySummary.late.length} sub={todaySummary.late.map((e) => e.name.split(" ")[0]).join(", ") || "on time"} tone={todaySummary.late.length ? "warning" : "default"} />
          <StatCard label="On leave today" value={todaySummary.leave.length} sub={todaySummary.leave.map((e) => e.name.split(" ")[0]).join(", ") || "nobody"} />
        </div>

        {/* Monthly register */}
        <Card>
          <CardHeader className="flex-col gap-4 sm:flex-row sm:items-center sm:justify-between space-y-0">
            <div><CardTitle>Monthly register</CardTitle><CardDescription>Present, absent, leave and late per employee</CardDescription></div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-wrap gap-1">
                {attMonths.slice(0, 4).map((m) => (
                  <button key={m} onClick={() => setAttMonth(m)} className={cn("rounded-md px-2.5 py-1 text-xs font-medium", attMonth === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent")}>
                    {new Date(`${m}-01`).toLocaleDateString("en-IN", { month: "short", year: "2-digit" })}
                  </button>
                ))}
              </div>
              <Button size="sm" variant="outline" onClick={downloadAttendancePdf}>
                <Download className="h-4 w-4 mr-1" /> Export PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <div className="mb-3 flex flex-wrap gap-3 text-xs">
              {Object.entries(ATT_TONE).map(([k, c]) => (
                <span key={k} className="flex items-center gap-1.5"><span className={cn("h-2.5 w-2.5 rounded-full", c)} />{titleCase(k)}</span>
              ))}
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-success ring-2 ring-warning" />Late</span>
            </div>
            <table className="w-full">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-card pb-2 pr-3 text-left text-2xs font-medium uppercase tracking-wide text-muted-foreground">Employee</th>
                  {monthDays.map((d) => <th key={d} className="pb-2 text-center text-[10px] text-muted-foreground">{d}</th>)}
                  <th className="pb-2 pl-3 text-center text-2xs font-medium uppercase text-muted-foreground">P / A / L</th>
                </tr>
              </thead>
              <tbody>
                {activeEmps.map((e) => {
                  const t = totalsFor(e.id);
                  return (
                    <tr key={e.id}>
                      <td className="sticky left-0 bg-card py-1.5 pr-3 text-sm font-medium">{e.name}</td>
                      {monthDays.map((d) => {
                        const a = attByEmpDay[e.id]?.[dayKey(d)];
                        const late = isLate(a);
                        return (
                          <td key={d} className="py-1.5 text-center">
                            <span
                              className={cn("mx-auto block h-3.5 w-3.5 rounded", a ? ATT_TONE[a.status] : "bg-muted/40", late && "ring-2 ring-warning")}
                              title={a ? `${titleCase(a.status)}${a.check_in ? ` · in ${a.check_in}` : ""}${late ? " (late)" : ""}` : "—"}
                            />
                          </td>
                        );
                      })}
                      <td className="whitespace-nowrap py-1.5 pl-3 text-center text-xs num">
                        <span className="text-success">{t.present}</span> / <span className="text-destructive">{t.absent}</span> / <span className="text-muted-foreground">{t.leave}</span>
                        {t.late > 0 && <span className="text-warning"> ({t.late}L)</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="leave">
        <Card>
          <CardHeader><CardTitle>Leave requests</CardTitle><CardDescription>{pendingLeave.length} awaiting a decision</CardDescription></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Employee</TableHead><TableHead>Type</TableHead><TableHead>Dates</TableHead>
                  <TableHead>Reason</TableHead><TableHead>Status</TableHead>{canDecideLeave && <TableHead />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {leave.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{empNames[l.employee_id] ?? "—"}</TableCell>
                    <TableCell className="capitalize">{l.type}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatDate(l.from_date)} – {formatDate(l.to_date)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{l.reason}</TableCell>
                    <TableCell><Badge variant={l.status === "approved" ? "success" : l.status === "rejected" ? "danger" : "warning"} className="capitalize">{l.status}</Badge></TableCell>
                    {canDecideLeave && (
                      <TableCell>
                        {l.status === "pending" && (
                          <div className="flex gap-1">
                            <Button size="icon-sm" variant="outline" onClick={() => decide(l.id, "approved")} aria-label="Approve"><Check className="h-4 w-4 text-success" /></Button>
                            <Button size="icon-sm" variant="outline" onClick={() => decide(l.id, "rejected")} aria-label="Reject"><X className="h-4 w-4 text-destructive" /></Button>
                          </div>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="payroll">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div><CardTitle>Payroll</CardTitle><CardDescription>{payMonth}</CardDescription></div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {months.map((m) => (
                  <button key={m} onClick={() => setPayMonth(m)} className={cn("rounded-md px-2.5 py-1 text-xs font-medium", payMonth === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent")}>{m}</button>
                ))}
              </div>
              {canRunPayroll && unpaidCount > 0 && <Button size="sm" onClick={pay}><Wallet className="h-4 w-4" /> Run payroll ({unpaidCount})</Button>}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Employee</TableHead><TableHead className="text-center">Present / Absent</TableHead><TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Deductions</TableHead><TableHead className="text-right">Net</TableHead><TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthPayroll.map((p) => {
                  const d = payDays(p.employee_id);
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{empNames[p.employee_id] ?? "—"}</TableCell>
                      <TableCell className="num text-center"><span className="text-success">{d.present}</span> / <span className={d.absent ? "text-destructive" : "text-muted-foreground"}>{d.absent}</span></TableCell>
                      <TableCell className="num text-right">{inr(p.gross)}</TableCell>
                      <TableCell className="num text-right text-muted-foreground">− {inr(p.deductions)}</TableCell>
                      <TableCell className="num text-right font-medium">{inr(p.net)}</TableCell>
                      <TableCell><Badge variant={p.status === "paid" ? "success" : "warning"} className="capitalize">{p.status}</Badge></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
