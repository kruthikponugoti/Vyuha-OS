import { all, sum, formatDateTz, formatMonthTz, prevMonthKeyTz } from "@/lib/data";
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

export async function getFinanceData(businessId: string, tz: string = "Asia/Kolkata"): Promise<FinanceData> {
  const [invoices, payments, expenses, orders, orderItems, products] = await Promise.all([
    all("invoices", businessId),
    all("payments", businessId),
    all("expenses", businessId),
    all("orders", businessId),
    all("order_items", businessId),
    all("products", businessId),
  ]);

  const thisMonthStr = formatMonthTz(new Date(), tz);
  const prevMonthStr = prevMonthKeyTz(tz);

  const revenueThisMonth = sum(payments.filter((p: Payment) => formatDateTz(p.paid_at, tz).startsWith(thisMonthStr)), (p) => p.amount);
  const expensesThisMonth = sum(expenses.filter((e: Expense) => formatDateTz(e.date, tz).startsWith(thisMonthStr)), (e) => e.amount);

  const outstanding = sum(invoices.filter((i: Invoice) => i.type === "invoice" && i.status !== "paid"), (i) => i.total - i.amount_paid);
  const overdueAmount = sum(invoices.filter((i: Invoice) => i.status === "overdue"), (i) => i.total - i.amount_paid);
  const paidCount = invoices.filter((i: Invoice) => i.status === "paid").length;

  // 6-month cash series
  const series: Record<string, { inflow: number; outflow: number }> = {};
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = formatMonthTz(d, tz);
    series[key] = { inflow: 0, outflow: 0 };
  }
  for (const p of payments as Payment[]) {
    const k = formatMonthTz(p.paid_at, tz);
    if (series[k]) series[k].inflow += p.amount;
  }
  for (const e of expenses as Expense[]) {
    const k = formatMonthTz(e.date, tz);
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
  const monthOrderIds = new Set(orders.filter((o: Order) => formatDateTz(o.created_at, tz).startsWith(thisMonthStr)).map((o) => o.id));
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
  for (const e of expenses.filter((e: Expense) => formatDateTz(e.date, tz).startsWith(thisMonthStr) || formatDateTz(e.date, tz).startsWith(prevMonthStr))) {
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
