import type { Metadata } from "next";
import { getSession, canWrite } from "@/lib/auth";
import { all } from "@/lib/data";
import { PageHeader } from "@/components/shell/page-header";
import { HrView } from "@/components/hr/hr-view";
import { RealtimeRegion } from "@/components/shell/realtime-region";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "HR" };

export default async function HrPage() {
  const session = (await getSession())!;
  const bid = session.business.id;
  const [employees, attendance, leave, payroll] = await Promise.all([
    all("employees", bid),
    all("attendance", bid),
    all("leave_requests", bid),
    all("payroll", bid),
  ]);
  const empNames = Object.fromEntries(employees.map((e) => [e.id, e.name]));
  const role = session.user.role;

  return (
    <div>
      <PageHeader title="People" description="Employees, attendance, leave and payroll." />
      <RealtimeRegion tables={["employees", "attendance", "leave_requests", "payroll"]}>
        <HrView
          employees={employees.sort((a, b) => a.name.localeCompare(b.name))}
          attendance={attendance}
          leave={leave.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())}
          payroll={payroll}
          empNames={empNames}
          canWriteEmployees={canWrite(role, "employees")}
          canDecideLeave={["owner", "admin", "hr", "manager"].includes(role)}
          canRunPayroll={canWrite(role, "payroll")}
        />
      </RealtimeRegion>
    </div>
  );
}
