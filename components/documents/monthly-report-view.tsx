"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generateReportPdf } from "@/lib/report-pdf";
import { formatMoney, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { 
  TrendingUp, TrendingDown, DollarSign, ShoppingBag, 
  UserCheck, AlertTriangle, CheckCircle2, Download, 
  Calendar, CreditCard, ChevronRight, AlertCircle
} from "lucide-react";
import type { MonthlyReportData } from "@/lib/queries/reports";

const MONTHS = [
  { val: 1, label: "January" },
  { val: 2, label: "February" },
  { val: 3, label: "March" },
  { val: 4, label: "April" },
  { val: 5, label: "May" },
  { val: 6, label: "June" },
  { val: 7, label: "July" },
  { val: 8, label: "August" },
  { val: 9, label: "September" },
  { val: 10, label: "October" },
  { val: 11, label: "November" },
  { val: 12, label: "December" },
];

const YEARS = [2024, 2025, 2026, 2027];

export function MonthlyReportView({
  report,
  businessName,
  currency,
}: {
  report: MonthlyReportData;
  businessName: string;
  currency: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [selectedMonth, setSelectedMonth] = React.useState(report.month);
  const [selectedYear, setSelectedYear] = React.useState(report.year);
  const [downloading, setDownloading] = React.useState(false);

  const money = (n: number) => formatMoney(n, currency);

  function handlePeriodChange(m: number, y: number) {
    setSelectedMonth(m);
    setSelectedYear(y);
    router.push(`${pathname}?year=${y}&month=${m}`);
  }

  function downloadPdf() {
    setDownloading(true);
    try {
      const metrics = [
        { label: "Revenue collected", value: money(report.revenue) },
        { label: "Expenses", value: money(report.expenses) },
        { label: "Net profit", value: money(report.netProfit) },
        { label: "Orders processed", value: String(report.orderCount) },
        { label: "Order sales value", value: money(report.orderValue) },
        { label: "Payments received", value: String(report.paymentCount) },
        { label: "Outstanding receivables", value: money(report.outstanding) },
        { label: "Overdue invoices count", value: String(report.overdueCount) },
      ];

      const sections = [
        {
          heading: "Top Products by Sales Volume",
          rows: report.topProducts.map((p) => [
            `${p.name} (${p.units} units)`,
            money(p.revenue),
          ]) as [string, string][],
        },
        {
          heading: "Top Customers by Spend",
          rows: report.topCustomers.map((c) => [
            c.name,
            money(c.spend),
          ]) as [string, string][],
        },
        {
          heading: "Expenses by Category",
          rows: report.expenseByCategory.map((c) => [
            c.name,
            money(c.value),
          ]) as [string, string][],
        },
        {
          heading: "Payments by Method",
          rows: report.paymentsByMethod.map((m) => [
            `${m.method.toUpperCase()} (${m.count} payments)`,
            money(m.total),
          ]) as [string, string][],
        },
      ];

      generateReportPdf({
        title: `${report.monthLabel} Business Report`,
        businessName,
        period: report.monthLabel,
        generatedOn: formatDate(new Date()),
        metrics,
        sections,
      });
      toast.success("Monthly report PDF downloaded successfully.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF report.");
    } finally {
      setDownloading(false);
    }
  }

  const netProfitColor = report.netProfit >= 0 ? "text-success" : "text-destructive";

  return (
    <div className="space-y-6 p-5 sm:p-8">
      {/* Month/Year selector & Action buttons */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <Select 
            value={String(selectedMonth)} 
            onValueChange={(v) => handlePeriodChange(parseInt(v, 10), selectedYear)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m) => (
                <SelectItem key={m.val} value={String(m.val)}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select 
            value={String(selectedYear)} 
            onValueChange={(v) => handlePeriodChange(selectedMonth, parseInt(v, 10))}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={downloadPdf} disabled={downloading} className="w-full sm:w-auto">
          <Download className="mr-2 h-4 w-4" />
          {downloading ? "Generating PDF..." : "Export as PDF"}
        </Button>
      </div>

      {/* Self-check Banner (Fix #13 requirement) */}
      <div className={`rounded-lg border p-4 ${
        report.selfCheck.passed 
          ? "bg-success-soft/30 border-success/30 text-success-foreground" 
          : "bg-destructive-soft/30 border-destructive/30 text-destructive-foreground"
      }`}>
        <div className="flex items-start gap-3">
          {report.selfCheck.passed ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-success shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-5 w-5 text-destructive shrink-0" />
          )}
          <div>
            <h4 className="font-semibold text-sm">
              {report.selfCheck.passed 
                ? "Self-Check Verification Passed" 
                : "Self-Check Verification Failure Detected"}
            </h4>
            <p className="mt-1 text-xs text-muted-foreground">
              {report.selfCheck.passed 
                ? "Report figures have been cross-checked and validated against direct database aggregates successfully." 
                : "A discrepancy was detected between computed totals and direct database sums. Check the system log."}
            </p>
            <div className="mt-2.5 flex flex-wrap gap-3 text-xs font-mono">
              <span className="flex items-center gap-1">
                Payments: {report.selfCheck.revenueMatch ? "✅ Match" : "❌ Discrepancy"}
              </span>
              <span className="flex items-center gap-1">
                Expenses: {report.selfCheck.expenseMatch ? "✅ Match" : "❌ Discrepancy"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="relative overflow-hidden">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Revenue Collected</span>
              <span className="rounded-md bg-success-soft p-1.5 text-success">
                <TrendingUp className="h-4.5 w-4.5" />
              </span>
            </div>
            <div className="mt-3">
              <span className="font-display text-2xl font-bold tracking-tight">{money(report.revenue)}</span>
              <p className="mt-0.5 text-xs text-muted-foreground">From {report.paymentCount} payments received</p>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Expenses</span>
              <span className="rounded-md bg-destructive-soft p-1.5 text-destructive">
                <TrendingDown className="h-4.5 w-4.5" />
              </span>
            </div>
            <div className="mt-3">
              <span className="font-display text-2xl font-bold tracking-tight">{money(report.expenses)}</span>
              <p className="mt-0.5 text-xs text-muted-foreground">Across {report.expenseByCategory.length} categories</p>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Net Profit</span>
              <span className={`rounded-md p-1.5 ${report.netProfit >= 0 ? "bg-success-soft text-success" : "bg-destructive-soft text-destructive"}`}>
                <DollarSign className="h-4.5 w-4.5" />
              </span>
            </div>
            <div className="mt-3">
              <span className={`font-display text-2xl font-bold tracking-tight ${netProfitColor}`}>
                {money(report.netProfit)}
              </span>
              <p className="mt-0.5 text-xs text-muted-foreground">Revenue minus expenses</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid of details */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Top Products</CardTitle>
            <CardDescription>Most selling items by sales revenue generated this month.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {report.topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No product sales recorded in this period.</p>
            ) : (
              report.topProducts.map((p, i) => (
                <div key={i} className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.units} units sold</p>
                  </div>
                  <span className="font-semibold text-sm">{money(p.revenue)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Expenses by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Expenses by Category</CardTitle>
            <CardDescription>Business operational expenditure distribution.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {report.expenseByCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No expenses recorded in this period.</p>
            ) : (
              report.expenseByCategory.map((c, i) => (
                <div key={i} className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                  </div>
                  <span className="font-semibold text-sm">{money(c.value)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Grid: Payments by Method & Top Customers */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Payments by Method */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Payments by Method</CardTitle>
            <CardDescription>Breakdown of received funds by channel.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {report.paymentsByMethod.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No payment transactions found.</p>
            ) : (
              report.paymentsByMethod.map((m, i) => (
                <div key={i} className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium capitalize">{m.method}</p>
                    <p className="text-xs text-muted-foreground">{m.count} payments</p>
                  </div>
                  <span className="font-semibold text-sm">{money(m.total)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Top Customers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Top Customers</CardTitle>
            <CardDescription>Key clients by spending volume this month.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {report.topCustomers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No customer transactions recorded.</p>
            ) : (
              report.topCustomers.map((c, i) => (
                <div key={i} className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                  </div>
                  <span className="font-semibold text-sm">{money(c.spend)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Unpaid / Outstanding Receivables table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Unpaid &amp; Outstanding Invoices</CardTitle>
          <CardDescription>Pending customer balances that require collection.</CardDescription>
        </CardHeader>
        <CardContent>
          {report.unpaidInvoices.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">All invoices are fully paid! Great job.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-border text-muted-foreground font-medium">
                    <th className="pb-2">Invoice #</th>
                    <th className="pb-2">Customer</th>
                    <th className="pb-2">Due Date</th>
                    <th className="pb-2 text-right">Outstanding Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {report.unpaidInvoices.map((inv, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="py-2.5 font-medium">{inv.number}</td>
                      <td className="py-2.5">{inv.customer}</td>
                      <td className="py-2.5 text-muted-foreground">{inv.dueDate}</td>
                      <td className="py-2.5 text-right font-semibold">{money(inv.due)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
