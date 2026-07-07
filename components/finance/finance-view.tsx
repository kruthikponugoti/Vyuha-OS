"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { StatCard } from "@/components/shell/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { RevenueAreaChart, DonutChart } from "@/components/charts/charts";
import { InvoiceComposer } from "./invoice-composer";
import { CrudTable } from "@/components/crud/crud-table";
import { exportCsv } from "@/lib/csv";
import { inr, formatDate, cn } from "@/lib/utils";
import { Search, Download } from "lucide-react";
import type { Invoice, Payment, Expense, Customer, Product } from "@/lib/types";
import type { FinanceData } from "@/lib/queries/finance";
import type { ColumnDef, FieldDef } from "@/components/crud/types";

const STATUS: Record<string, "success" | "warning" | "danger" | "muted" | "primary"> = {
  paid: "success", sent: "primary", partial: "warning", overdue: "danger", draft: "muted",
};

const expenseFields: FieldDef[] = [
  { name: "description", label: "Description", required: true, full: true },
  { name: "category", label: "Category", type: "select", options: ["Rent", "Utilities", "Marketing", "Logistics", "Supplies", "Salaries", "Insurance", "Other"].map((v) => ({ value: v, label: v })), defaultValue: "Other" },
  { name: "vendor", label: "Vendor" },
  { name: "amount", label: "Amount (₹)", type: "number", required: true },
  { name: "date", label: "Date", type: "date" },
];

export function FinanceView({
  data, invoices, payments, expenses, customers, products, customerNames, canWriteInvoice, canWritePayment, canWriteExpense,
}: {
  data: FinanceData;
  invoices: Invoice[];
  payments: Payment[];
  expenses: Expense[];
  customers: Customer[];
  products: Product[];
  customerNames: Record<string, string>;
  canWriteInvoice: boolean;
  canWritePayment: boolean;
  canWriteExpense: boolean;
}) {
  const router = useRouter();
  const [invQuery, setInvQuery] = React.useState("");
  const [invFilter, setInvFilter] = React.useState<string>("all");

  const filteredInvoices = invoices.filter((i) => {
    if (invFilter !== "all" && i.status !== invFilter) return false;
    if (invQuery) {
      const q = invQuery.toLowerCase();
      return i.number.toLowerCase().includes(q) || customerNames[i.customer_id]?.toLowerCase().includes(q);
    }
    return true;
  });

  const expenseColumns: ColumnDef<Expense>[] = [
    { key: "description", header: "Description", render: (r) => <span className="font-medium">{r.description}</span> },
    { key: "category", header: "Category", render: (r) => <Badge variant="muted">{r.category}</Badge> },
    { key: "vendor", header: "Vendor", render: (r) => r.vendor ?? "—" },
    { key: "date", header: "Date", render: (r) => formatDate(r.date) },
    { key: "amount", header: "Amount", className: "text-right", render: (r) => <span className="num font-medium">{inr(r.amount)}</span> },
  ];

  return (
    <Tabs defaultValue="overview" className="p-5 sm:p-8">
     <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="invoices">Invoices ({invoices.length})</TabsTrigger>
        <TabsTrigger value="expenses">Expenses ({expenses.length})</TabsTrigger>
        <TabsTrigger value="payments">Payments ({payments.length})</TabsTrigger>
        <TabsTrigger value="pnl">P&amp;L</TabsTrigger>
        <TabsTrigger value="cashflow">Cash flow</TabsTrigger>
      </TabsList>

      {/* Overview */}
      <TabsContent value="overview" className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Revenue this month" value={inr(data.revenueThisMonth)} sub="payments received" />
          <StatCard label="Expenses this month" value={inr(data.expensesThisMonth)} />
          <StatCard label="Net profit" value={inr(data.netProfit)} tone={data.netProfit >= 0 ? "success" : "danger"} />
          <StatCard label="Outstanding" value={inr(data.outstanding)} tone={data.outstanding > 0 ? "warning" : "default"} sub={`${inr(data.overdueAmount)} overdue`} />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Cash flow</CardTitle><CardDescription>Inflow vs outflow, last 6 months</CardDescription></CardHeader>
            <CardContent>
              <RevenueAreaChart data={data.cashSeries} keys={[{ key: "inflow", label: "Inflow" }, { key: "outflow", label: "Outflow" }]} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Expenses by category</CardTitle><CardDescription>Last 30 days</CardDescription></CardHeader>
            <CardContent>
              {data.expenseByCategory.length ? <DonutChart data={data.expenseByCategory} money height={230} /> : <p className="py-8 text-center text-sm text-muted-foreground">No expenses.</p>}
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* Invoices */}
      <TabsContent value="invoices" className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-2">
            <div className="relative max-w-xs flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={invQuery} onChange={(e) => setInvQuery(e.target.value)} placeholder="Search invoices…" className="pl-8" />
            </div>
            <div className="flex gap-1">
              {["all", "sent", "paid", "partial", "overdue", "draft"].map((s) => (
                <button key={s} onClick={() => setInvFilter(s)} className={cn("rounded-md px-2.5 py-1 text-xs font-medium capitalize", invFilter === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent")}>{s}</button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => exportCsv("invoices", filteredInvoices as any)}><Download className="h-4 w-4" /> Export</Button>
            {canWriteInvoice && <InvoiceComposer customers={customers} products={products} type="quotation" trigger={<Button variant="outline" size="sm">New quotation</Button>} />}
            {canWriteInvoice && <InvoiceComposer customers={customers} products={products} type="invoice" />}
          </div>
        </div>
        <div className="rounded-card border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Number</TableHead><TableHead>Customer</TableHead><TableHead>Type</TableHead>
                <TableHead>Issued</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((i) => (
                <TableRow key={i.id} className="cursor-pointer" onClick={() => router.push(`/finance/invoices/${i.id}`)}>
                  <TableCell className="font-medium">{i.number}</TableCell>
                  <TableCell>{customerNames[i.customer_id] ?? "—"}</TableCell>
                  <TableCell className="capitalize text-muted-foreground">{i.type}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(i.issue_date)}</TableCell>
                  <TableCell><Badge variant={STATUS[i.status]} className="capitalize">{i.status}</Badge></TableCell>
                  <TableCell className="num text-right font-medium">{inr(i.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      {/* Expenses */}
      <TabsContent value="expenses">
        <CrudTable
          table="expenses" rows={expenses} columns={expenseColumns} fields={expenseFields}
          searchKeys={["description", "category", "vendor"]}
          filters={[{ key: "category", label: "Category", options: [...new Set(expenses.map((e) => e.category))].map((c) => ({ value: c, label: c })) }]}
          entityName="expense" revalidate="/finance" canWrite={canWriteExpense} exportName="expenses"
          serialize={(v) => ({ ...v, amount: Number(v.amount) || 0, tax_amount: 0, date: v.date || new Date().toISOString().slice(0, 10) })}
        />
      </TabsContent>

      {/* Payments */}
      <TabsContent value="payments">
        <div className="rounded-card border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Date</TableHead><TableHead>Customer</TableHead><TableHead>Method</TableHead>
                <TableHead>Reference</TableHead><TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...payments].sort((a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime()).map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-muted-foreground">{formatDate(p.paid_at)}</TableCell>
                  <TableCell className="font-medium">{customerNames[p.customer_id] ?? "—"}</TableCell>
                  <TableCell><Badge variant="muted" className="uppercase">{p.method}</Badge></TableCell>
                  <TableCell className="num text-xs text-muted-foreground">{p.reference ?? "—"}</TableCell>
                  <TableCell className="num text-right font-medium text-success">{inr(p.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      {/* P&L */}
      <TabsContent value="pnl">
        <Card className="mx-auto max-w-xl">
          <CardHeader><CardTitle>Profit &amp; loss</CardTitle><CardDescription>This month</CardDescription></CardHeader>
          <CardContent className="space-y-1">
            <PnlRow label="Revenue" value={data.pnl.revenue} />
            <PnlRow label="Cost of goods sold" value={-data.pnl.cogs} muted />
            <PnlRow label="Gross profit" value={data.pnl.grossProfit} bold divider />
            <PnlRow label="Operating expenses" value={-data.pnl.expenses} muted />
            <PnlRow label="Net profit" value={data.pnl.net} bold divider tone={data.pnl.net >= 0 ? "success" : "danger"} />
          </CardContent>
        </Card>
      </TabsContent>

      {/* Cash flow */}
      <TabsContent value="cashflow" className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Cash flow</CardTitle><CardDescription>Net cash movement, last 6 months</CardDescription></CardHeader>
          <CardContent>
            <RevenueAreaChart data={data.cashSeries} keys={[{ key: "inflow", label: "Inflow" }, { key: "outflow", label: "Outflow" }]} />
          </CardContent>
        </Card>
        <div className="rounded-card border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Month</TableHead><TableHead className="text-right">Inflow</TableHead>
                <TableHead className="text-right">Outflow</TableHead><TableHead className="text-right">Net</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.cashSeries.map((c) => (
                <TableRow key={c.month}>
                  <TableCell className="font-medium">{c.month}</TableCell>
                  <TableCell className="num text-right text-success">{inr(c.inflow)}</TableCell>
                  <TableCell className="num text-right text-muted-foreground">{inr(c.outflow)}</TableCell>
                  <TableCell className={cn("num text-right font-medium", c.net >= 0 ? "text-success" : "text-destructive")}>{inr(c.net)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TabsContent>
    </Tabs>
  );
}

function PnlRow({ label, value, bold, muted, divider, tone }: { label: string; value: number; bold?: boolean; muted?: boolean; divider?: boolean; tone?: "success" | "danger" }) {
  return (
    <div className={cn("flex items-center justify-between py-2", divider && "border-t border-border")}>
      <span className={cn(bold ? "font-semibold" : muted ? "text-muted-foreground" : "")}>{label}</span>
      <span className={cn("num", bold && "font-semibold", tone === "success" && "text-success", tone === "danger" && "text-destructive")}>{inr(value)}</span>
    </div>
  );
}
