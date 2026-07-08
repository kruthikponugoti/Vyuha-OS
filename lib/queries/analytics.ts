import { all, byId, monthsAgo, monthKey, sum } from "@/lib/data";
import { formatMoney } from "@/lib/utils";
import type { Payment, Order, OrderItem, Product, Customer, Category, Invoice } from "@/lib/types";

export interface AnalyticsData {
  revenueSeries: { month: string; revenue: number }[];
  ordersSeries: { month: string; orders: number }[];
  salesByCategory: { name: string; value: number }[];
  topProducts: { name: string; units: number; revenue: number }[];
  topCustomers: { name: string; value: number }[];
  customersByCity: { name: string; value: number }[];
  aov: number;
  repeatRate: number;
  forecast: { month: string; revenue: number; projected?: boolean }[];
  recommendations: { tone: "good" | "watch" | "alert"; title: string; text: string }[];
}

const LABEL = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "short" });
};

export async function getAnalyticsData(businessId: string): Promise<AnalyticsData> {
  const [payments, orders, orderItems, products, customers, categories, invoices, business] = await Promise.all([
    all("payments", businessId),
    all("orders", businessId),
    all("order_items", businessId),
    all("products", businessId),
    all("customers", businessId),
    all("categories", businessId),
    all("invoices", businessId),
    byId("businesses", businessId, businessId),
  ]);
  const currency = business?.currency ?? "INR";

  // 6-month series
  const revByMonth: Record<string, number> = {};
  const ordByMonth: Record<string, number> = {};
  for (let i = 5; i >= 0; i--) { const k = monthKey(monthsAgo(i)); revByMonth[k] = 0; ordByMonth[k] = 0; }
  for (const p of payments as Payment[]) { const k = monthKey(p.paid_at); if (k in revByMonth) revByMonth[k] += p.amount; }
  for (const o of orders as Order[]) { const k = monthKey(o.created_at); if (k in ordByMonth) ordByMonth[k] += 1; }
  const revenueSeries = Object.entries(revByMonth).map(([month, revenue]) => ({ month: LABEL(month), revenue }));
  const ordersSeries = Object.entries(ordByMonth).map(([month, orders]) => ({ month: LABEL(month), orders }));

  // category + product
  const prodById = new Map(products.map((p: Product) => [p.id, p]));
  const catById = new Map(categories.map((c: Category) => [c.id, c.name]));
  const catTotals: Record<string, number> = {};
  const prodTotals: Record<string, { name: string; units: number; revenue: number }> = {};
  for (const it of orderItems as OrderItem[]) {
    const p = prodById.get(it.product_id);
    if (!p) continue;
    const rev = it.price * it.qty;
    const cat = (p.category_id && catById.get(p.category_id)) || "Uncategorised";
    catTotals[cat] = (catTotals[cat] || 0) + rev;
    prodTotals[it.product_id] ??= { name: p.name, units: 0, revenue: 0 };
    prodTotals[it.product_id].units += it.qty;
    prodTotals[it.product_id].revenue += rev;
  }
  const salesByCategory = Object.entries(catTotals).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  const topProducts = Object.values(prodTotals).sort((a, b) => b.revenue - a.revenue).slice(0, 6);

  // customers
  const topCustomers = [...customers].sort((a, b) => b.total_spend - a.total_spend).slice(0, 6).map((c: Customer) => ({ name: c.name, value: c.total_spend }));
  const cityTotals: Record<string, number> = {};
  for (const c of customers as Customer[]) { const city = c.city || "Other"; cityTotals[city] = (cityTotals[city] || 0) + 1; }
  const customersByCity = Object.entries(cityTotals).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);

  const paidOrders = orders.length;
  const aov = paidOrders ? Math.round(sum(orders, (o: Order) => o.total) / paidOrders) : 0;
  const ordersPerCustomer: Record<string, number> = {};
  for (const o of orders as Order[]) ordersPerCustomer[o.customer_id] = (ordersPerCustomer[o.customer_id] || 0) + 1;
  const repeat = Object.values(ordersPerCustomer).filter((n) => n > 1).length;
  const repeatRate = Object.keys(ordersPerCustomer).length ? Math.round((repeat / Object.keys(ordersPerCustomer).length) * 100) : 0;

  // simple linear forecast: next 2 months from trailing average growth
  const revValues = Object.values(revByMonth);
  const nonZero = revValues.filter((v) => v > 0);
  const avg = nonZero.length ? nonZero.reduce((a, b) => a + b, 0) / nonZero.length : 0;
  const recent = revValues.slice(-3);
  const trend = recent.length >= 2 ? (recent[recent.length - 1] - recent[0]) / (recent.length - 1) : 0;
  const forecast: AnalyticsData["forecast"] = revenueSeries.map((r) => ({ month: r.month, revenue: r.revenue }));
  let last = revValues[revValues.length - 1] || avg;
  for (let i = 1; i <= 2; i++) {
    const d = new Date(); d.setMonth(d.getMonth() + i, 1);
    last = Math.max(0, Math.round(last + trend));
    forecast.push({ month: d.toLocaleDateString("en-IN", { month: "short" }), revenue: last, projected: true });
  }

  // recommendations
  const recommendations: AnalyticsData["recommendations"] = [];
  const lowStock = products.filter((p: Product) => p.stock_qty <= p.low_stock_threshold);
  if (topProducts[0]) recommendations.push({ tone: "good", title: "Double down on your bestseller", text: `${topProducts[0].name} drives the most revenue (${formatMoney(topProducts[0].revenue, currency)}). Keep it well stocked and feature it prominently.` });
  if (lowStock.length) recommendations.push({ tone: "alert", title: "Restock before you lose sales", text: `${lowStock.length} products are below reorder level. Raising purchase orders now avoids stockouts on fast movers.` });
  if (repeatRate < 40) recommendations.push({ tone: "watch", title: "Grow repeat business", text: `Only ${repeatRate}% of customers have ordered more than once. A follow-up or loyalty nudge could lift repeat rate.` });
  const overdue = invoices.filter((i: Invoice) => i.status === "overdue");
  if (overdue.length) recommendations.push({ tone: "watch", title: "Tighten collections", text: `${overdue.length} invoices are overdue. Sending reminders would improve cash flow this month.` });
  if (salesByCategory[0]) recommendations.push({ tone: "good", title: "Category concentration", text: `${salesByCategory[0].name} leads your sales mix. Consider expanding adjacent products in this category.` });

  return { revenueSeries, ordersSeries, salesByCategory, topProducts, topCustomers, customersByCity, aov, repeatRate, forecast, recommendations };
}
