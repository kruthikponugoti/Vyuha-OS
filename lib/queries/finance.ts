import { all, startOfMonth, monthsAgo, monthKey, sum } from "@/lib/data";
import type { Invoice, Payment, Expense, Order } from "@/lib/types";

export interface FinanceData {
  revenueThisMonth: number;
  expensesThisMonth: number;
  netProfit: number;
  outstanding: number;
  overdueAmount: number;
  paidCount: number;
  cashSeries: { month: string; inflow: number; outflow: number; net: number }[];
  pnl: { revenue: number; cogs: number; grossProfit: number; expenses: number; net: number };
  expenseByCategory: { name: string; value: number }[];
}

const LABEL = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "short" });
};

export async function getFinanceData(businessId: string): Promise<FinanceData> {
  const [invoices, payments, expenses, orders, orderItems, products] = await Promise.all([
    all("invoices", businessId),
    all("payments", businessId),
    all("expenses", businessId),
    all("orders", businessId),
    all("order_items", businessId),
    all("products", businessId),
  ]);

  const monthStart = startOfMonth();
  const revenueThisMonth = sum(payments.filter((p: Payment) => new Date(p.paid_at) >= monthStart), (p) => p.amount);
  const expensesThisMonth = sum(expenses.filter((e: Expense) => new Date(e.date) >= monthStart), (e) => e.amount);

  const outstanding = sum(invoices.filter((i: Invoice) => i.type === "invoice" && i.status !== "paid"), (i) => i.total - i.amount_paid);
  const overdueAmount = sum(invoices.filter((i: Invoice) => i.status === "overdue"), (i) => i.total - i.amount_paid);
  const paidCount = invoices.filter((i: Invoice) => i.status === "paid").length;

  // 6-month cash series
  const series: Record<string, { inflow: number; outflow: number }> = {};
  for (let i = 5; i >= 0; i--) series[monthKey(monthsAgo(i))] = { inflow: 0, outflow: 0 };
  for (const p of payments as Payment[]) {
    const k = monthKey(p.paid_at);
    if (series[k]) series[k].inflow += p.amount;
  }
  for (const e of expenses as Expense[]) {
    const k = monthKey(e.date);
    if (series[k]) series[k].outflow += e.amount;
  }
  const cashSeries = Object.entries(series).map(([month, v]) => ({
    month: LABEL(month),
    inflow: v.inflow,
    outflow: v.outflow,
    net: v.inflow - v.outflow,
  }));

  // P&L (this month): COGS estimated from cost of sold items this month
  const prodCost = new Map(products.map((p) => [p.id, p.cost]));
  const monthOrderIds = new Set(orders.filter((o: Order) => new Date(o.created_at) >= monthStart).map((o) => o.id));
  const cogs = sum(
    orderItems.filter((it) => monthOrderIds.has(it.order_id)),
    (it) => (prodCost.get(it.product_id) ?? 0) * it.qty
  );
  const pnl = {
    revenue: revenueThisMonth,
    cogs,
    grossProfit: revenueThisMonth - cogs,
    expenses: expensesThisMonth,
    net: revenueThisMonth - cogs - expensesThisMonth,
  };

  const byCat: Record<string, number> = {};
  for (const e of expenses.filter((e: Expense) => new Date(e.date) >= monthsAgo(1))) {
    byCat[e.category] = (byCat[e.category] || 0) + e.amount;
  }
  const expenseByCategory = Object.entries(byCat).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  return {
    revenueThisMonth,
    expensesThisMonth,
    netProfit: revenueThisMonth - expensesThisMonth,
    outstanding,
    overdueAmount,
    paidCount,
    cashSeries,
    pnl,
    expenseByCategory,
  };
}
