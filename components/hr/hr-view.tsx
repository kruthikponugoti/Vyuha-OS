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
import { Check, X, Wallet } from "lucide-react";
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

  // attendance: last 14 days grid per employee
  const days = [...new Set(attendance.map((a) => a.date))].sort().slice(-14);
  const attByEmpDay: Record<string, Record<string, string>> = {};
  for (const a of attendance) {
    (attByEmpDay[a.employee_id] ??= {})[a.date] = a.status;
  }

  const pendingLeave = leave.filter((l) => l.status === "pending");
  const months = [...new Set(payroll.map((p) => p.month))].sort().reverse();
  const [payMonth, setPayMonth] = React.useState(months[0] ?? "");
  const monthPayroll = payroll.filter((p) => p.month === payMonth);
  const unpaidCount = monthPayroll.filter((p) => p.status !== "paid").length;

  async function decide(id: string, d: "approved" | "rejected") {
    const res = await decideLeave(id, d);
    if (res.ok) { toast.success(`Leave ${d}.`); router.refresh(); } else toast.error(res.error ?? "Failed.");
  }
  async function pay() {
    const res = await runPayroll(payMonth);
    if (res.ok) { toast.success(`Marked ${res.count} payslips paid.`); router.refresh(); } else toast.error(res.error ?? "Failed.");
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

      <TabsContent value="attendance">
        <Card>
          <CardHeader><CardTitle>Attendance</CardTitle><CardDescription>Last {days.length} working days</CardDescription></CardHeader>
          <CardContent className="overflow-x-auto">
            <div className="mb-3 flex flex-wrap gap-3 text-xs">
              {Object.entries(ATT_TONE).map(([k, c]) => (
                <span key={k} className="flex items-center gap-1.5"><span className={cn("h-2.5 w-2.5 rounded-full", c)} />{titleCase(k)}</span>
              ))}
            </div>
            <table className="w-full">
              <thead>
                <tr>
                  <th className="pb-2 text-left text-2xs font-medium uppercase tracking-wide text-muted-foreground">Employee</th>
                  {days.map((d) => <th key={d} className="pb-2 text-center text-2xs text-muted-foreground">{new Date(d).getDate()}</th>)}
                </tr>
              </thead>
              <tbody>
                {employees.map((e) => (
                  <tr key={e.id}>
                    <td className="py-1.5 pr-4 text-sm font-medium">{e.name}</td>
                    {days.map((d) => {
                      const st = attByEmpDay[e.id]?.[d];
                      return <td key={d} className="py-1.5 text-center"><span className={cn("mx-auto block h-4 w-4 rounded", st ? ATT_TONE[st] : "bg-muted")} title={st ? titleCase(st) : "—"} /></td>;
                    })}
                  </tr>
                ))}
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
                  <TableHead>Employee</TableHead><TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Deductions</TableHead><TableHead className="text-right">Net</TableHead><TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthPayroll.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{empNames[p.employee_id] ?? "—"}</TableCell>
                    <TableCell className="num text-right">{inr(p.gross)}</TableCell>
                    <TableCell className="num text-right text-muted-foreground">− {inr(p.deductions)}</TableCell>
                    <TableCell className="num text-right font-medium">{inr(p.net)}</TableCell>
                    <TableCell><Badge variant={p.status === "paid" ? "success" : "warning"} className="capitalize">{p.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
