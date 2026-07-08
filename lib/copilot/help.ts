// Small built-in help corpus so the Copilot can answer questions ABOUT the
// product itself (what modules exist, what a role can do, how to do a task) —
// not just from the business's data.

import type { Role } from "@/lib/types";
import { MODULE_ACCESS, MODULE_LABELS, type ModuleKey } from "@/lib/permissions";
import { titleCase } from "@/lib/utils";

interface HelpEntry {
  keywords: RegExp;
  answer: string;
}

const MODULE_HELP: Record<string, string> = {
  crm: "CRM manages customers, leads, a deal pipeline, and activity history on each contact.",
  inventory: "Inventory tracks products (with barcodes), suppliers, warehouses, stock movements, purchase orders, low-stock alerts and a demand forecast.",
  finance: "Finance handles invoices, quotations, payments, expenses, tax, P&L and cash flow — and generates PDFs.",
  hr: "HR covers employees, attendance (clock in/out, register), leave requests, and payroll.",
  projects: "Projects gives you a task kanban, calendar, timeline, comments and attachments.",
  analytics: "Analytics has real charts for sales, revenue, customers and inventory, plus AI recommendations.",
  documents: "Documents generates and stores invoices, quotations, reports and contracts as PDF.",
  "knowledge-base": "Knowledge Base lets you upload documents so the Copilot can answer questions from them.",
  copilot: "The AI Copilot runs real actions across every module and shows a step-by-step trace of what changed.",
};

const HELP: HelpEntry[] = [
  {
    keywords: /what (can|do) (you|i)|what.*(help|do for me)|capabilities|what are you/,
    answer:
      "I run your business from plain language: check revenue, sales and stock; record orders, invoices and payments; look up customers; check attendance and leave; and answer questions from your documents. I only act on data your role can access.",
  },
  {
    keywords: /what modules|which modules|what.*(features|tools).*(have|are there)|list.*modules/,
    answer:
      "Vyuha OS has Dashboard, AI Copilot, CRM, Inventory, Finance, HR, Projects, Analytics, Documents, Knowledge Base, Notifications and Settings.",
  },
  {
    keywords: /how (do|to) i.*(invoice)/,
    answer:
      "Ask me “create an invoice for [customer] — [qty] [product]”, or go to Finance → Invoices → New. Invoices export to PDF from the invoice page.",
  },
  {
    keywords: /how (do|to) i.*(order)/,
    answer:
      "Say “record an order from [customer] — [qty] [product]”. I validate stock, decrement inventory, create the order, raise the invoice and draft a customer note — all in one step.",
  },
  {
    keywords: /how (do|to) i.*(stock|inventory)/,
    answer:
      "Ask “how much stock of [product] is left?” to check, or “add 10 [product] to stock” to adjust. The Inventory module has the full product list, suppliers and purchase orders.",
  },
  {
    keywords: /clock in|clock out|mark attendance|check in/,
    answer:
      "Employees clock in and out from the Clock card on their Dashboard (one tap). HR sees today's attendance live and the monthly register in the HR module.",
  },
  {
    keywords: /roles?|permission|who can|access/,
    answer:
      "There are 8 roles — Owner, Admin, Manager, Finance, Sales, HR, Employee, Viewer. Owner and Admin see everything; each other role sees only its modules, dashboard cards and data, enforced in the UI, the routes and the database.",
  },
  {
    keywords: /export|csv|pdf|download/,
    answer:
      "Every list exports to CSV from its toolbar, and invoices, quotations and business reports export to PDF from their pages.",
  },
];

export function getHelp(role: Role, query: string): { answer: string } {
  const q = query.toLowerCase();

  // "what can a Sales user do" / "what can I do" → role capabilities
  if (/what can (a |an )?(\w+ )?(role|user)?.*(do|access|see)|my (role|access|permissions)/.test(q)) {
    const mods = (Object.keys(MODULE_ACCESS) as ModuleKey[]).filter((m) => MODULE_ACCESS[m].includes(role));
    return {
      answer: `As ${titleCase(role)}, you can use: ${mods.map((m) => MODULE_LABELS[m]).join(", ")}. Ask me anything within those and I'll help.`,
    };
  }

  // Module-specific "what is X / tell me about X"
  for (const [mod, text] of Object.entries(MODULE_HELP)) {
    if (new RegExp(`\\b${mod.replace("-", "[ -]?")}\\b`).test(q) && /what|about|tell me|explain|how/.test(q)) {
      return { answer: text };
    }
  }

  for (const entry of HELP) {
    if (entry.keywords.test(q)) return { answer: entry.answer };
  }

  return {
    answer:
      "I can help across CRM, Inventory, Finance, HR, Projects, Analytics and your Knowledge Base — checking data or running actions in plain language. What would you like to do?",
  };
}
