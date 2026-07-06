// Dashboard metrics — every number computed from real rows, nothing hardcoded.

import { all, startOfToday, startOfMonth, monthsAgo, monthKey, sum, isSameDay } from "@/lib/data";
import type {
  Invoice, Payment, Order, Product, Customer, Expense, Category,
} from "@/lib/types";

export interface DashboardData {
  revenueThisMonth: number;
  revenueToday: number;
  revenuePrevMonth: number;
  ordersToday: number;
  ordersThisMonth: number;
  customerCount: number;
  newCustomersThisMonth: number;
  inventoryValue: number;
  lowStock: { name: string; stock_qty: number; threshold: number }[];
  outstanding: number;
  overdueCount: number;
  expensesThisMonth: number;
  cashFlow: number;
  healthScore: number;
  healthBreakdown: { label: string; score: number; weight: number }[];
  revenueSeries: { month: string; revenue: number; expenses: number }[];
  salesByCategory: { name: string; value: number }[];
  topProducts: { name: string; units: number; revenue: number }[];
  insights: { tone: "good" | "watch" | "alert"; text: string }[];
}

const MONTH_LABEL = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "short" });
};

export async function getDashboardData(businessId: string): Promise<DashboardData> {
  const [invoices, payments, orders, products, customers, expenses, categories, orderItems] =
    await Promise.all([
      all("invoices", businessId),
      all("payments", businessId),
      all("orders", businessId),
      all("products", businessId),
      all("customers", businessId),
      all("expenses", businessId),
      all("categories", businessId),
      all("order_items", businessId),
    ]);

  const today = startOfToday();
  const monthStart = startOfMonth();
  const prevMonthStart = monthsAgo(1);

  // Revenue = payments received
  const revenueThisMonth = sum(
    payments.filter((p: Payment) => new Date(p.paid_at) >= monthStart),
    (p) => p.amount
  );
  const revenueToday = sum(
    payments.filter((p: Payment) => isSameDay(p.paid_at, today)),
    (p) => p.amount
  );
  const revenuePrevMonth = sum(
    payments.filter(
      (p: Payment) => new Date(p.paid_at) >= prevMonthStart && new Date(p.paid_at) < monthStart
    ),
    (p) => p.amount
  );

  const ordersToday = orders.filter((o: Order) => isSameDay(o.created_at, today)).length;
  const ordersThisMonth = orders.filter((o: Order) => new Date(o.created_at) >= monthStart).length;

  const newCustomersThisMonth = customers.filter(
    (c: Customer) => new Date(c.created_at) >= monthStart
  ).length;

  const inventoryValue = sum(products, (p: Product) => p.cost * p.stock_qty);
  const lowStock = products
    .filter((p: Product) => p.stock_qty <= p.low_stock_threshold)
    .map((p: Product) => ({ name: p.name, stock_qty: p.stock_qty, threshold: p.low_stock_threshold }))
    .sort((a, b) => a.stock_qty - b.stock_qty);

  const outstanding = sum(
    invoices.filter((i: Invoice) => i.type === "invoice" && i.status !== "paid"),
    (i) => i.total - i.amount_paid
  );
  const overdueCount = invoices.filter((i: Invoice) => i.status === "overdue").length;

  const expensesThisMonth = sum(
    expenses.filter((e: Expense) => new Date(e.date) >= monthStart),
    (e) => e.amount
  );
  const cashFlow = revenueThisMonth - expensesThisMonth;

  // 6-month revenue vs expenses series
  const series: Record<string, { revenue: number; expenses: number }> = {};
  for (let i = 5; i >= 0; i--) {
    const key = monthKey(monthsAgo(i));
    series[key] = { revenue: 0, expenses: 0 };
  }
  for (const p of payments as Payment[]) {
    const key = monthKey(p.paid_at);
    if (series[key]) series[key].revenue += p.amount;
  }
  for (const e of expenses as Expense[]) {
    const key = monthKey(e.date);
    if (series[key]) series[key].expenses += e.amount;
  }
  const revenueSeries = Object.entries(series).map(([month, v]) => ({
    month: MONTH_LABEL(month),
    revenue: v.revenue,
    expenses: v.expenses,
  }));

  // Sales by category + top products (from order items)
  const catById = new Map(categories.map((c: Category) => [c.id, c.name]));
  const prodById = new Map(products.map((p: Product) => [p.id, p]));
  const catTotals: Record<string, number> = {};
  const prodTotals: Record<string, { name: string; units: number; revenue: number }> = {};
  for (const it of orderItems) {
    const prod = prodById.get(it.product_id);
    if (!prod) continue;
    const rev = it.price * it.qty;
    const catName = (prod.category_id && catById.get(prod.category_id)) || "Uncategorised";
    catTotals[catName] = (catTotals[catName] || 0) + rev;
    if (!prodTotals[it.product_id]) prodTotals[it.product_id] = { name: prod.name, units: 0, revenue: 0 };
    prodTotals[it.product_id].units += it.qty;
    prodTotals[it.product_id].revenue += rev;
  }
  const salesByCategory = Object.entries(catTotals)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  const topProducts = Object.values(prodTotals).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  // Business health score (0–100), weighted composite
  const collectionRate =
    outstanding + revenueThisMonth > 0
      ? revenueThisMonth / (revenueThisMonth + outstanding)
      : 1;
  const stockHealth = products.length > 0 ? 1 - lowStock.length / products.length : 1;
  const margin =
    revenueThisMonth > 0 ? Math.max(0, Math.min(1, cashFlow / revenueThisMonth)) : 0.5;
  const growth =
    revenuePrevMonth > 0
      ? Math.max(0, Math.min(1, revenueThisMonth / revenuePrevMonth / 1.5))
      : 0.6;
  const healthBreakdown = [
    { label: "Collections", score: Math.round(collectionRate * 100), weight: 0.3 },
    { label: "Stock health", score: Math.round(stockHealth * 100), weight: 0.25 },
    { label: "Profitability", score: Math.round(margin * 100), weight: 0.25 },
    { label: "Growth", score: Math.round(growth * 100), weight: 0.2 },
  ];
  const healthScore = Math.round(
    healthBreakdown.reduce((s, h) => s + h.score * h.weight, 0)
  );

  // Rule-based AI insights
  const insights: DashboardData["insights"] = [];
  if (lowStock.length > 0) {
    insights.push({
      tone: "alert",
      text: `${lowStock.length} product${lowStock.length > 1 ? "s are" : " is"} below reorder level — ${lowStock
        .slice(0, 2)
        .map((p) => p.name)
        .join(", ")}${lowStock.length > 2 ? " and more" : ""}. Consider raising a purchase order.`,
    });
  }
  if (overdueCount > 0) {
    insights.push({
      tone: "watch",
      text: `${overdueCount} invoice${overdueCount > 1 ? "s are" : " is"} overdue, worth ₹${outstanding.toLocaleString(
        "en-IN"
      )} in total. Sending reminders could speed up cash flow.`,
    });
  }
  if (revenuePrevMonth > 0) {
    const delta = ((revenueThisMonth - revenuePrevMonth) / revenuePrevMonth) * 100;
    insights.push({
      tone: delta >= 0 ? "good" : "watch",
      text:
        delta >= 0
          ? `Revenue is up ${delta.toFixed(0)}% versus last month. ${topProducts[0]?.name ?? "Your top product"} is leading sales.`
          : `Revenue is down ${Math.abs(delta).toFixed(0)}% versus last month. Worth reviewing your pipeline and follow-ups.`,
    });
  }
  if (cashFlow > 0) {
    insights.push({
      tone: "good",
      text: `You're cash-flow positive this month by ₹${cashFlow.toLocaleString("en-IN")} after expenses.`,
    });
  }

  return {
    revenueThisMonth,
    revenueToday,
    revenuePrevMonth,
    ordersToday,
    ordersThisMonth,
    customerCount: customers.length,
    newCustomersThisMonth,
    inventoryValue,
    lowStock,
    outstanding,
    overdueCount,
    expensesThisMonth,
    cashFlow,
    healthScore,
    healthBreakdown,
    revenueSeries,
    salesByCategory,
    topProducts,
    insights,
  };
}

export interface ActivityItem {
  id: string;
  icon: string;
  title: string;
  detail: string;
  at: string;
}

export async function getRecentActivity(businessId: string, limit = 8): Promise<ActivityItem[]> {
  const audit = await all("audit_logs", businessId);
  return audit
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit)
    .map((a) => ({
      id: a.id,
      icon: a.entity_type,
      title: `${a.user_name} ${a.action} ${a.entity_type.replace(/_/g, " ")}`,
      detail: a.detail,
      at: a.created_at,
    }));
}
