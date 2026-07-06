// Read-only revenue / sales analysis used by the Copilot and Analytics.

import { all, startOfToday, startOfMonth, monthsAgo, isSameDay, sum } from "@/lib/data";
import type { Payment, Order, Invoice, Expense, Product, Category } from "@/lib/types";

export type Period = "today" | "week" | "month" | "quarter" | "year";

function since(period: Period): Date {
  const now = new Date();
  switch (period) {
    case "today":
      return startOfToday();
    case "week": {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return d;
    }
    case "quarter":
      return monthsAgo(3);
    case "year":
      return monthsAgo(12);
    default:
      return startOfMonth();
  }
}

export async function getRevenue(businessId: string, period: Period = "month") {
  const payments = await all("payments", businessId);
  const from = since(period);
  const inWindow = payments.filter((p: Payment) =>
    period === "today" ? isSameDay(p.paid_at, from) : new Date(p.paid_at) >= from
  );
  return {
    period,
    total_revenue: sum(inWindow, (p) => p.amount),
    payment_count: inWindow.length,
  };
}

export async function analyzeSales(businessId: string, period: Period = "month") {
  const [orders, orderItems, products, categories, payments] = await Promise.all([
    all("orders", businessId),
    all("order_items", businessId),
    all("products", businessId),
    all("categories", businessId),
    all("payments", businessId),
  ]);
  const from = since(period);
  const windowOrders = orders.filter((o: Order) =>
    period === "today" ? isSameDay(o.created_at, from) : new Date(o.created_at) >= from
  );
  const orderIds = new Set(windowOrders.map((o) => o.id));
  const items = orderItems.filter((it) => orderIds.has(it.order_id));

  const prodById = new Map(products.map((p: Product) => [p.id, p]));
  const catById = new Map(categories.map((c: Category) => [c.id, c.name]));
  const byProduct: Record<string, { name: string; units: number; revenue: number }> = {};
  const byCategory: Record<string, number> = {};
  for (const it of items) {
    const p = prodById.get(it.product_id);
    if (!p) continue;
    const rev = it.price * it.qty;
    byProduct[it.product_id] ??= { name: p.name, units: 0, revenue: 0 };
    byProduct[it.product_id].units += it.qty;
    byProduct[it.product_id].revenue += rev;
    const cat = (p.category_id && catById.get(p.category_id)) || "Uncategorised";
    byCategory[cat] = (byCategory[cat] || 0) + rev;
  }
  const topProducts = Object.values(byProduct).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  const salesByCategory = Object.entries(byCategory).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  const revenue = sum(
    payments.filter((p: Payment) => (period === "today" ? isSameDay(p.paid_at, from) : new Date(p.paid_at) >= from)),
    (p) => p.amount
  );

  return {
    period,
    order_count: windowOrders.length,
    order_value: sum(windowOrders, (o) => o.total),
    revenue_collected: revenue,
    avg_order_value: windowOrders.length ? Math.round(sum(windowOrders, (o) => o.total) / windowOrders.length) : 0,
    top_products: topProducts,
    sales_by_category: salesByCategory,
  };
}

export async function generateReport(businessId: string, period: Period = "month") {
  const [invoices, payments, expenses, orders, products, customers] = await Promise.all([
    all("invoices", businessId),
    all("payments", businessId),
    all("expenses", businessId),
    all("orders", businessId),
    all("products", businessId),
    all("customers", businessId),
  ]);
  const from = since(period);
  const inWin = (d: string) => (period === "today" ? isSameDay(d, from) : new Date(d) >= from);

  const revenue = sum(payments.filter((p: Payment) => inWin(p.paid_at)), (p) => p.amount);
  const expenseTotal = sum(expenses.filter((e: Expense) => inWin(e.date)), (e) => e.amount);
  const orderCount = orders.filter((o: Order) => inWin(o.created_at)).length;
  const outstanding = sum(
    invoices.filter((i: Invoice) => i.type === "invoice" && i.status !== "paid"),
    (i) => i.total - i.amount_paid
  );
  const lowStock = products.filter((p: Product) => p.stock_qty <= p.low_stock_threshold).length;
  const newCustomers = customers.filter((c) => inWin(c.created_at)).length;

  return {
    period,
    revenue,
    expenses: expenseTotal,
    net_profit: revenue - expenseTotal,
    order_count: orderCount,
    outstanding,
    low_stock_count: lowStock,
    new_customers: newCustomers,
    total_customers: customers.length,
  };
}
