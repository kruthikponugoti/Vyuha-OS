// Deterministic intent router used when no GEMINI_API_KEY is set. Parses common
// business commands into the same tool calls Gemini would make, so the Copilot
// is fully functional in demo mode.

export interface ParsedIntent {
  tool: string | null;
  args: Record<string, any>;
}

function parsePeriod(q: string): string {
  if (/\btoday\b|so far today/.test(q)) return "today";
  if (/\bthis week\b|\bweek\b/.test(q)) return "week";
  if (/\bquarter\b/.test(q)) return "quarter";
  if (/\bthis year\b|\byear\b|annual/.test(q)) return "year";
  return "month";
}

function parseCustomerAndItems(message: string): { customer_name: string; items: { product_name: string; qty: number }[] } {
  const fromMatch = message.match(/(?:from|for)\s+([A-Z][\w'&.]*(?:\s+[A-Z][\w'&.]*){0,3})/);
  const customer_name = fromMatch ? fromMatch[1].trim() : "";
  const itemsPart = message.split(/[—:–-]/).slice(1).join(" ") || message;
  const items: { product_name: string; qty: number }[] = [];
  const re = /(\d+)\s*(?:x|×|units? of)?\s*([A-Za-z][A-Za-z\s&-]*?)(?=\s+and\s+\d|\s*,|\s*$|\s+and\s*$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(itemsPart)) !== null) {
    const nameRaw = m[2].trim().replace(/\b(for|to|the|a)\b\s*$/i, "").trim();
    if (nameRaw) items.push({ product_name: nameRaw, qty: parseInt(m[1], 10) });
  }
  return { customer_name, items };
}

export function routeLocally(message: string): ParsedIntent {
  const q = message.toLowerCase();

  // knowledge base (policy / process questions)
  if (/\b(policy|return|refund|warranty|guarantee|handbook|operating hours|store hours|delivery (fee|charge)|emi|onboard|gstin|net 30|payment terms)\b/.test(q) || /^(what is|what'?s|how do we|how does|can (a )?customer|are we|do we) .*(policy|return|refund|warranty|deliver|hours|emi|open)/.test(q)) {
    return { tool: "search_knowledge", args: { query: message } };
  }

  // product help (meta questions about Vyuha OS itself)
  if (/what can (you|i) do|what modules|which modules|what.*(features|capabilities)|how do i (create|make|add|record|generate|export|clock)|what can (a |an )?\w+ (do|access|see)|what('?s| is) my (role|access)|help me (get started|use)/.test(q)) {
    return { tool: "get_help", args: { query: message } };
  }

  // my own attendance / leave
  if (/\bmy (attendance|leave|leaves|balance)\b|am i (present|marked|in)|how many leaves? (do|have) i/.test(q)) {
    return { tool: "my_attendance", args: {} };
  }
  // a named employee's leave
  if (/leaves? (left|balance|remaining)|how many leaves? (does|has)/.test(q)) {
    const m = message.match(/(?:does|has|for|of)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
    if (m) return { tool: "employee_leave", args: { employee_name: m[1].trim() } };
  }
  // payroll (HR-only; routes here so restricted roles get a clear refusal)
  if (/\bpayroll\b|salaries|salary (run|paid|this month)|payslip/.test(q)) {
    const mm = message.match(/(\d{4}-\d{2})/);
    return { tool: "payroll_summary", args: mm ? { month: mm[1] } : {} };
  }
  // attendance today
  if (/who('?s| is| are)?\s*(absent|present|in|off|on leave|out)\s*(today)?|attendance (today|now)|who.*(absent|present).*today/.test(q)) {
    return { tool: "attendance_today", args: {} };
  }
  // unpaid / overdue invoices
  if (/unpaid|who (hasn'?t|has not|have not|haven'?t) paid|outstanding invoice|overdue|who owes|amount due|not paid|pending payment/.test(q)) {
    return { tool: "list_unpaid", args: {} };
  }
  // expenses
  if (/\bexpenses?\b|how much.*(spen[dt]|cost)|spending this month|our costs/.test(q)) {
    return { tool: "get_expenses", args: {} };
  }
  // project status
  if (/project status|how (are|is).*(project|the projects)|projects?.*(going|progress|status)|status of.*project/.test(q)) {
    return { tool: "project_status", args: {} };
  }

  // health
  if (/business health|how('?s| is) (the |my )?business|health score/.test(q)) {
    return { tool: "get_business_health", args: {} };
  }
  // report
  if (/\b(report|summary|overview|how did we do|how are we doing|p&l|profit)\b/.test(q) && !/sales/.test(q)) {
    return { tool: "generate_business_report", args: { period: parsePeriod(q) } };
  }
  // sales analysis
  if (/(analyse|analyze|breakdown|top (products|sellers)|best sell|sales (this|by|for))/.test(q)) {
    return { tool: "analyze_sales", args: { period: parsePeriod(q) } };
  }
  // revenue
  if (/\b(revenue|sales figure|how much (did|have) we (make|made|earn)|turnover|income today|money)\b/.test(q) || /^show.*(revenue|sales)/.test(q)) {
    return { tool: "get_revenue", args: { period: parsePeriod(q) } };
  }
  // reminder
  if (/reminder|remind|chase (up )?payment|nudge/.test(q)) {
    const m = message.match(/(?:to|for|remind)\s+([A-Z][\w'&.]*(?:\s+[A-Z][\w'&.]*){0,3})/);
    return { tool: "send_payment_reminder", args: { customer_name: m ? m[1].trim() : message } };
  }
  // record payment
  if (/record (a )?payment|mark .* paid|received payment|paid (the )?invoice/.test(q)) {
    const inv = message.match(/(INV|QUO)[- ]?\d{4}[- ]?\d{3,4}/i);
    const amt = message.match(/₹?\s?([\d,]{3,})/);
    return { tool: "record_payment", args: { invoice_ref: inv ? inv[0].replace(/\s/g, "").toUpperCase() : message, amount: amt ? Number(amt[1].replace(/,/g, "")) : undefined } };
  }
  // create order (full workflow)
  if (/new order|record .*order|place .*order|took an order|sold\b|order from/.test(q)) {
    return { tool: "create_order", args: parseCustomerAndItems(message) };
  }
  // quotation
  if (/quotation|quote\b/.test(q)) {
    return { tool: "create_quotation", args: parseCustomerAndItems(message) };
  }
  // create invoice
  if (/invoice/.test(q) && /(create|make|raise|generate|new|for)/.test(q)) {
    return { tool: "create_invoice", args: parseCustomerAndItems(message) };
  }
  // update stock
  if (/(update|adjust|add|increase|reduce|decrease|set) .*(stock|inventory)|restock|received \d/.test(q)) {
    const m = message.match(/(-?\d+)\s*(?:units?|pcs)?\s*(?:of|to|for)?\s*([A-Za-z][A-Za-z\s&-]{2,})/);
    const negative = /reduce|decrease|remove|sold|damaged|write.?off/.test(q);
    if (m) {
      const qty = Math.abs(parseInt(m[1], 10)) * (negative ? -1 : 1);
      return { tool: "update_stock", args: { product_name: m[2].trim(), qty } };
    }
  }
  // check stock
  if (/stock|inventory|how many|left|in store|available/.test(q)) {
    const m = message.match(/(?:of|for)\s+([A-Za-z][A-Za-z\s&-]{2,})/);
    return { tool: "check_stock", args: { product_name: m ? m[1].trim() : message } };
  }
  // add customer
  if (/(add|create|new)\s+customer|register .*customer/.test(q)) {
    const m = message.match(/customer\s+(?:named\s+|called\s+)?([A-Z][\w'&.]*(?:\s+[A-Z][\w'&.]*){0,3})/i);
    const company = message.match(/(?:from|at|company)\s+([A-Z][\w'&.]*(?:\s+[A-Z][\w'&.]*){0,3})/);
    return { tool: "create_customer", args: { name: m ? m[1].trim() : "", company: company ? company[1].trim() : undefined } };
  }
  // find customers
  if (/(find|search|look up|show).*customer|who (is|are)|customer.*(named|called)/.test(q)) {
    const m = message.match(/customers?\s+(?:named\s+|called\s+|matching\s+|for\s+)?([A-Za-z][\w\s'&.]*)/i);
    return { tool: "search_customers", args: { query: m ? m[1].trim() : message.replace(/[^a-z\s]/gi, "").trim() } };
  }

  return { tool: null, args: {} };
}
