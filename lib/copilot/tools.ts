// Copilot tool registry. Each tool exposes a Gemini function declaration, an
// implementation that runs a real service/query, and a plain-language summary.
// The same registry is driven by the local NL router when no Gemini key is set.

import type { Actor } from "@/lib/services";
import * as svc from "@/lib/services";
import { getRevenue, analyzeSales, generateReport, type Period } from "@/lib/queries/reports";
import { getDashboardData } from "@/lib/queries/dashboard";
import { searchKnowledge } from "@/lib/queries/knowledge";
import { inr } from "@/lib/utils";

export interface ToolContext {
  actor: Actor;
}

export interface ToolResult {
  ok: boolean;
  summary: string;
  data?: any;
  trace?: { label: string; status: "done" | "failed" }[];
  invoice_id?: string | null;
  confirm?: boolean;
  error?: string;
}

export const ACTION_LABELS: Record<string, string> = {
  get_revenue: "Checked revenue",
  get_business_health: "Checked business health",
  create_customer: "Added customer",
  search_customers: "Searched customers",
  update_stock: "Updated stock",
  check_stock: "Checked inventory",
  create_invoice: "Created invoice",
  create_quotation: "Created quotation",
  record_payment: "Recorded payment",
  send_payment_reminder: "Drafted reminder",
  create_order: "Processed order",
  analyze_sales: "Analysed sales",
  generate_business_report: "Generated report",
  search_knowledge: "Searched knowledge base",
};

// Actions that mutate data — the Copilot confirms before running these.
export const DESTRUCTIVE = new Set([
  "create_invoice",
  "create_quotation",
  "record_payment",
  "create_order",
  "update_stock",
  "create_customer",
]);

const itemsSchema = {
  type: "array",
  items: {
    type: "object",
    properties: {
      product_name: { type: "string" },
      qty: { type: "number" },
    },
    required: ["product_name", "qty"],
  },
};

export const FUNCTION_DECLARATIONS = [
  { name: "get_revenue", description: "Get revenue for a period.", parameters: { type: "object", properties: { period: { type: "string", enum: ["today", "week", "month", "quarter", "year"] } } } },
  { name: "get_business_health", description: "Overall business health score and its drivers.", parameters: { type: "object", properties: {} } },
  { name: "create_customer", description: "Add a new customer.", parameters: { type: "object", properties: { name: { type: "string" }, company: { type: "string" }, phone: { type: "string" }, email: { type: "string" }, city: { type: "string" } }, required: ["name"] } },
  { name: "search_customers", description: "Find customers by name, company, email or city.", parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } },
  { name: "check_stock", description: "Check stock level for a product.", parameters: { type: "object", properties: { product_name: { type: "string" } }, required: ["product_name"] } },
  { name: "update_stock", description: "Adjust a product's stock by a positive or negative quantity.", parameters: { type: "object", properties: { product_name: { type: "string" }, qty: { type: "number", description: "Positive to add, negative to remove." }, reason: { type: "string" } }, required: ["product_name", "qty"] } },
  { name: "create_invoice", description: "Create an invoice for a customer with line items.", parameters: { type: "object", properties: { customer_name: { type: "string" }, items: itemsSchema }, required: ["customer_name", "items"] } },
  { name: "create_quotation", description: "Create a quotation (draft, no stock change) for a customer.", parameters: { type: "object", properties: { customer_name: { type: "string" }, items: itemsSchema }, required: ["customer_name", "items"] } },
  { name: "record_payment", description: "Record a payment against an invoice number.", parameters: { type: "object", properties: { invoice_ref: { type: "string", description: "Invoice number, e.g. INV-2026-0007" }, amount: { type: "number" } }, required: ["invoice_ref"] } },
  { name: "send_payment_reminder", description: "Draft a payment reminder for a customer with unpaid invoices.", parameters: { type: "object", properties: { customer_name: { type: "string" } }, required: ["customer_name"] } },
  { name: "create_order", description: "Record a full new order: validate stock, decrement inventory, create the order, generate an invoice and draft a customer message.", parameters: { type: "object", properties: { customer_name: { type: "string" }, items: itemsSchema }, required: ["customer_name", "items"] } },
  { name: "analyze_sales", description: "Analyse sales for a period: order count, value, top products, categories.", parameters: { type: "object", properties: { period: { type: "string", enum: ["today", "week", "month", "quarter", "year"] } } } },
  { name: "generate_business_report", description: "A summary business report for a period: revenue, expenses, profit, outstanding.", parameters: { type: "object", properties: { period: { type: "string", enum: ["today", "week", "month", "quarter", "year"] } } } },
  { name: "search_knowledge", description: "Answer a policy or process question using the business's uploaded knowledge base documents (return policy, warranty, operations handbook, etc.). Use this for 'what is our...', 'how do we...' questions.", parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } },
];

export async function runTool(name: string, args: any, ctx: ToolContext): Promise<ToolResult> {
  const { actor } = ctx;
  const bid = actor.businessId;
  try {
    switch (name) {
      case "get_revenue": {
        const r = await getRevenue(bid, (args.period as Period) || "month");
        const label = r.period === "today" ? "Today" : `This ${r.period}`;
        return { ok: true, summary: r.payment_count === 0 ? `${label} there's no revenue recorded yet.` : `${label} you've collected ${inr(r.total_revenue)} across ${r.payment_count} payment${r.payment_count === 1 ? "" : "s"}.`, data: r };
      }
      case "get_business_health": {
        const d = await getDashboardData(bid);
        const weakest = [...d.healthBreakdown].sort((a, b) => a.score - b.score)[0];
        return { ok: true, summary: `Business health is ${d.healthScore}/100. The weakest area is ${weakest.label.toLowerCase()} at ${weakest.score}.`, data: { score: d.healthScore, breakdown: d.healthBreakdown, insights: d.insights } };
      }
      case "create_customer": {
        const c = await svc.createCustomer(actor, args);
        return { ok: true, summary: `Added ${c.name}${c.company ? ` (${c.company})` : ""} to your customers.`, data: { customer: c } };
      }
      case "search_customers": {
        const rows = await svc.searchCustomers(bid, args.query || "");
        return { ok: true, summary: rows.length ? `Found ${rows.length} customer${rows.length === 1 ? "" : "s"} matching “${args.query}”.` : `No customers matched “${args.query}”.`, data: { customers: rows } };
      }
      case "check_stock": {
        const r = await svc.checkStock(bid, args.product_name || "");
        if (!r.found) return { ok: false, summary: `No product matching “${args.product_name}”.`, error: "not_found" };
        return { ok: true, summary: r.low_stock ? `${r.product.name} is low — ${r.product.stock_qty} left (reorder point ${r.product.low_stock_threshold}).` : `You have ${r.product.stock_qty} × ${r.product.name} in stock.`, data: { product: r.product, low_stock: r.low_stock } };
      }
      case "update_stock": {
        const r = await svc.updateStock(actor, args.product_name, Math.round(Number(args.qty)), args.reason || "Manual adjustment");
        return { ok: true, summary: `Updated ${r.product.name} — ${r.previous} → ${r.newQty} in stock.`, data: r };
      }
      case "create_invoice":
      case "create_quotation": {
        const type = name === "create_quotation" ? "quotation" : "invoice";
        const r = await svc.createInvoiceDoc(actor, { customer_name: args.customer_name, items: args.items, type });
        return { ok: true, summary: `${type === "quotation" ? "Quotation" : "Invoice"} ${r.invoice.number} created for ${r.customer.name} — ${inr(r.invoice.total)}.`, data: { line_items: r.line_items, total: r.invoice.total, number: r.invoice.number }, invoice_id: r.invoice.id };
      }
      case "record_payment": {
        const r = await svc.recordPayment(actor, { invoiceRef: args.invoice_ref, amount: args.amount != null ? Number(args.amount) : undefined });
        return { ok: true, summary: `Recorded ${inr(r.amount)} against ${r.invoice.number}${r.fullyPaid ? " — now fully paid." : ` — ${inr(r.invoice.total - r.invoice.amount_paid)} still due.`}`, data: r };
      }
      case "send_payment_reminder": {
        const r = await svc.sendPaymentReminder(actor, args.customer_name);
        if (!r.unpaid.length) return { ok: true, summary: `${r.customer.name} has no unpaid invoices — nothing to remind about.`, data: r };
        return { ok: true, summary: `Drafted a reminder to ${r.customer.name} for ${inr(r.dueTotal)} across ${r.unpaid.length} invoice${r.unpaid.length === 1 ? "" : "s"}.`, data: { notification_draft: r.drafted, dueTotal: r.dueTotal } };
      }
      case "create_order": {
        const r = await svc.createOrderWorkflow(actor, { customer_name: args.customer_name, items: args.items });
        return { ok: true, summary: `Order recorded for ${r.customer.name} — ${inr(r.total)}. Stock updated, invoice ${r.invoice.number} ready, customer message drafted for your review.`, data: { line_items: r.line_items, total: r.total, notification_draft: r.notification_draft }, trace: r.steps, invoice_id: r.invoice.id };
      }
      case "analyze_sales": {
        const r = await analyzeSales(bid, (args.period as Period) || "month");
        const top = r.top_products[0];
        return { ok: true, summary: r.order_count === 0 ? `No sales in this ${r.period} yet.` : `This ${r.period}: ${r.order_count} orders worth ${inr(r.order_value)}, average ${inr(r.avg_order_value)}.${top ? ` Top seller: ${top.name}.` : ""}`, data: r };
      }
      case "generate_business_report": {
        const r = await generateReport(bid, (args.period as Period) || "month");
        return { ok: true, summary: `This ${r.period}: revenue ${inr(r.revenue)}, expenses ${inr(r.expenses)}, net ${inr(r.net_profit)}. ${r.order_count} orders, ${inr(r.outstanding)} outstanding.`, data: r };
      }
      case "search_knowledge": {
        const passages = await searchKnowledge(bid, args.query || "");
        if (!passages.length) return { ok: true, summary: `I couldn't find anything about that in your knowledge base documents.`, data: { passages: [] } };
        const answer = passages.map((p) => p.text).join(" ");
        const sources = [...new Set(passages.map((p) => p.fileName))];
        return { ok: true, summary: `${answer} (From ${sources.join(", ")}.)`, data: { passages, sources } };
      }
      default:
        return { ok: false, summary: `Unknown action ${name}.`, error: "unknown_tool" };
    }
  } catch (e: any) {
    return { ok: false, summary: e?.message ?? "That action failed.", error: e?.message };
  }
}
