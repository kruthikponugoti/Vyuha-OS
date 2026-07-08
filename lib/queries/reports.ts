// Read-only revenue / sales analysis used by the Copilot and Analytics.

import { all, startOfToday, startOfMonth, monthsAgo, isSameDay, sum } from "@/lib/data";
import type { Payment, Order, Invoice, Expense, Product, Category, Customer, Employee, Attendance } from "@/lib/types";

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

// ---------------------------------------------------------------------------
// Monthly business report — explicit month boundaries, comprehensive breakdown
// ---------------------------------------------------------------------------

export interface MonthlyReportData {
  year: number;
  month: number;
  monthLabel: string;
  revenue: number;
  expenses: number;
  netProfit: number;
  orderCount: number;
  orderValue: number;
  paymentsReceived: number;
  paymentCount: number;
  outstanding: number;
  overdueCount: number;
  topProducts: { name: string; units: number; revenue: number }[];
  topCustomers: { name: string; spend: number }[];
  paymentsByMethod: { method: string; total: number; count: number }[];
  expenseByCategory: { name: string; value: number }[];
  unpaidInvoices: { number: string; customer: string; due: number; dueDate: string }[];
  selfCheck: { passed: boolean; revenueMatch: boolean; expenseMatch: boolean };
}

export async function generateMonthlyReport(
  businessId: string,
  year: number,
  month: number // 1-indexed
): Promise<MonthlyReportData> {
  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 1));
  const monthLabel = from.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  const [invoices, payments, expenses, orders, orderItems, products, categories, customers] = await Promise.all([
    all("invoices", businessId),
    all("payments", businessId),
    all("expenses", businessId),
    all("orders", businessId),
    all("order_items", businessId),
    all("products", businessId),
    all("categories", businessId),
    all("customers", businessId),
  ]);

  const inMonth = (d: string) => { const dt = new Date(d); return dt >= from && dt < to; };
  const custName = new Map(customers.map((c: Customer) => [c.id, c.name]));

  // Revenue = payments received in the month
  const monthPayments = payments.filter((p: Payment) => inMonth(p.paid_at));
  const revenue = sum(monthPayments, (p) => p.amount);
  const paymentCount = monthPayments.length;

  // Expenses in the month
  const monthExpenses = expenses.filter((e: Expense) => inMonth(e.date));
  const expenseTotal = sum(monthExpenses, (e) => e.amount);

  // Orders in the month
  const monthOrders = orders.filter((o: Order) => inMonth(o.created_at));
  const orderCount = monthOrders.length;
  const orderValue = sum(monthOrders, (o) => o.total);

  // Outstanding and overdue
  const outstanding = sum(
    invoices.filter((i: Invoice) => i.type === "invoice" && i.status !== "paid"),
    (i) => i.total - i.amount_paid
  );
  const overdueCount = invoices.filter((i: Invoice) => i.status === "overdue").length;

  // Top products from month's orders
  const orderIds = new Set(monthOrders.map((o) => o.id));
  const items = orderItems.filter((it) => orderIds.has(it.order_id));
  const prodById = new Map(products.map((p: Product) => [p.id, p]));
  const prodTotals: Record<string, { name: string; units: number; revenue: number }> = {};
  for (const it of items) {
    const p = prodById.get(it.product_id);
    if (!p) continue;
    const rev = it.price * it.qty;
    prodTotals[it.product_id] ??= { name: p.name, units: 0, revenue: 0 };
    prodTotals[it.product_id].units += it.qty;
    prodTotals[it.product_id].revenue += rev;
  }
  const topProducts = Object.values(prodTotals).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  // Top customers (by payments in the month)
  const custSpend: Record<string, number> = {};
  for (const p of monthPayments) {
    custSpend[p.customer_id] = (custSpend[p.customer_id] || 0) + p.amount;
  }
  const topCustomers = Object.entries(custSpend)
    .map(([id, spend]) => ({ name: custName.get(id) ?? "Unknown", spend }))
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 5);

  // Payment breakdown by method
  const byMethod: Record<string, { total: number; count: number }> = {};
  for (const p of monthPayments) {
    byMethod[p.method] ??= { total: 0, count: 0 };
    byMethod[p.method].total += p.amount;
    byMethod[p.method].count += 1;
  }
  const paymentsByMethod = Object.entries(byMethod).map(([method, v]) => ({ method, ...v }));

  // Expense breakdown by category
  const byCat: Record<string, number> = {};
  for (const e of monthExpenses) byCat[e.category] = (byCat[e.category] || 0) + e.amount;
  const expenseByCategory = Object.entries(byCat).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  // Unpaid invoices
  const unpaidInvoices = invoices
    .filter((i: Invoice) => i.type === "invoice" && i.status !== "paid")
    .map((i) => ({
      number: i.number,
      customer: custName.get(i.customer_id) ?? "Unknown",
      due: i.total - i.amount_paid,
      dueDate: i.due_date,
    }))
    .sort((a, b) => b.due - a.due)
    .slice(0, 10);

  // Self-check: verify report totals against direct sums
  const directRevenue = monthPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const directExpense = monthExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const revenueMatch = Math.abs(revenue - directRevenue) < 0.01;
  const expenseMatch = Math.abs(expenseTotal - directExpense) < 0.01;

  return {
    year,
    month,
    monthLabel,
    revenue,
    expenses: expenseTotal,
    netProfit: revenue - expenseTotal,
    orderCount,
    orderValue,
    paymentsReceived: revenue,
    paymentCount,
    outstanding,
    overdueCount,
    topProducts,
    topCustomers,
    paymentsByMethod,
    expenseByCategory,
    unpaidInvoices,
    selfCheck: { passed: revenueMatch && expenseMatch, revenueMatch, expenseMatch },
  };
}

// ---------------------------------------------------------------------------
// Monthly attendance register — aggregated by employee for payroll
// ---------------------------------------------------------------------------

export interface MonthlyAttendanceRow {
  employeeId: string;
  employeeName: string;
  department: string;
  present: number;
  absent: number;
  halfDay: number;
  leave: number;
  remote: number;
  notMarked: number;
  totalDays: number;
}

export async function getMonthlyAttendance(
  businessId: string,
  year: number,
  month: number
): Promise<MonthlyAttendanceRow[]> {
  const [employees, attendance] = await Promise.all([
    all("employees", businessId),
    all("attendance", businessId),
  ]);

  // Count workdays in the month (Mon-Sat = 6 days/week, no Sun)
  const daysInMonth = new Date(year, month, 0).getDate();
  const workdays: string[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, month - 1, d);
    if (dt.getDay() !== 0) workdays.push(dt.toISOString().slice(0, 10)); // exclude Sunday
  }
  const totalDays = workdays.length;

  const attByEmp = new Map<string, Map<string, string>>();
  for (const a of attendance as Attendance[]) {
    if (!attByEmp.has(a.employee_id)) attByEmp.set(a.employee_id, new Map());
    attByEmp.get(a.employee_id)!.set(a.date, a.status);
  }

  return (employees as Employee[])
    .filter((e) => e.status !== "exited")
    .map((emp) => {
      const records = attByEmp.get(emp.id) ?? new Map();
      let present = 0, absent = 0, halfDay = 0, leave = 0, remote = 0, notMarked = 0;
      for (const day of workdays) {
        const status = records.get(day);
        if (!status) { notMarked++; continue; }
        switch (status) {
          case "present": present++; break;
          case "absent": absent++; break;
          case "half_day": halfDay++; break;
          case "leave": leave++; break;
          case "remote": remote++; break;
          default: notMarked++;
        }
      }
      return {
        employeeId: emp.id,
        employeeName: emp.name,
        department: emp.department,
        present,
        absent,
        halfDay,
        leave,
        remote,
        notMarked,
        totalDays,
      };
    })
    .sort((a, b) => a.employeeName.localeCompare(b.employeeName));
}

