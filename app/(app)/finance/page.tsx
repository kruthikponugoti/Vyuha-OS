import type { Metadata } from "next";
import { getSession, canWrite } from "@/lib/auth";
import { all } from "@/lib/data";
import { getFinanceData } from "@/lib/queries/finance";
import { PageHeader } from "@/components/shell/page-header";
import { FinanceView } from "@/components/finance/finance-view";
import { RealtimeRegion } from "@/components/shell/realtime-region";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Finance" };

export default async function FinancePage() {
  const session = (await getSession())!;
  const bid = session.business.id;
  const [data, invoices, payments, expenses, customers, products] = await Promise.all([
    getFinanceData(bid, session.business.timezone),
    all("invoices", bid),
    all("payments", bid),
    all("expenses", bid),
    all("customers", bid),
    all("products", bid),
  ]);

  const customerNames = Object.fromEntries(customers.map((c) => [c.id, c.name]));

  return (
    <div>
      <PageHeader title="Finance" description="Invoices, expenses, payments, P&L and cash flow." />
      <RealtimeRegion tables={["invoices", "payments", "expenses", "customers", "products"]}>
        <FinanceView
          data={data}
          invoices={invoices.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())}
          payments={payments}
          expenses={expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())}
          customers={customers.sort((a, b) => a.name.localeCompare(b.name))}
          products={products.sort((a, b) => a.name.localeCompare(b.name))}
          customerNames={customerNames}
          canWriteInvoice={canWrite(session.user.role, "invoices")}
          canWritePayment={canWrite(session.user.role, "payments")}
          canWriteExpense={canWrite(session.user.role, "expenses")}
        />
      </RealtimeRegion>
    </div>
  );
}
