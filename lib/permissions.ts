// Single source of truth for role → access.
//
// Every gate in the app reads from here: the sidebar (which nav items render),
// the dashboard (which widgets render), and the route guard (which module URLs
// a role may reach). Keep this file the ONE place to adjust access.
//
// Owner and Admin appear in every list — they see everything, no restrictions.

import type { Role } from "./types";

export type ModuleKey =
  | "dashboard"
  | "copilot"
  | "crm"
  | "inventory"
  | "finance"
  | "hr"
  | "projects"
  | "analytics"
  | "documents"
  | "knowledge-base"
  | "notifications"
  | "settings";

// Which roles may access (view / reach) each module.
export const MODULE_ACCESS: Record<ModuleKey, Role[]> = {
  dashboard: ["owner", "admin", "manager", "finance", "sales", "hr", "employee", "viewer"],
  copilot: ["owner", "admin", "manager", "finance", "sales", "hr", "employee"],
  crm: ["owner", "admin", "manager", "sales"],
  inventory: ["owner", "admin", "manager", "sales"],
  finance: ["owner", "admin", "manager", "finance"],
  hr: ["owner", "admin", "hr"],
  projects: ["owner", "admin", "manager", "employee"],
  analytics: ["owner", "admin", "manager", "finance", "viewer"],
  documents: ["owner", "admin", "manager", "finance", "sales", "hr"],
  "knowledge-base": ["owner", "admin"],
  notifications: ["owner", "admin", "manager", "finance", "sales", "hr", "employee", "viewer"],
  settings: ["owner", "admin"],
};

export const MODULE_LABELS: Record<ModuleKey, string> = {
  dashboard: "Dashboard",
  copilot: "AI Copilot",
  crm: "CRM",
  inventory: "Inventory",
  finance: "Finance",
  hr: "HR",
  projects: "Projects",
  analytics: "Analytics",
  documents: "Documents",
  "knowledge-base": "Knowledge Base",
  notifications: "Notifications",
  settings: "Settings",
};

export function canAccessModule(role: Role, module: ModuleKey): boolean {
  return MODULE_ACCESS[module]?.includes(role) ?? false;
}

/** Map a URL pathname to its module key (first path segment). */
export function moduleForPath(pathname: string): ModuleKey | null {
  const seg = pathname.replace(/^\/+/, "").split(/[/?#]/)[0];
  return seg && seg in MODULE_ACCESS ? (seg as ModuleKey) : null;
}

// ---------------------------------------------------------------------------
// Dashboard widgets → roles allowed to see them. Owner/Admin see all.
// ---------------------------------------------------------------------------

export type WidgetKey =
  | "kpi_revenue"
  | "kpi_orders"
  | "kpi_customers"
  | "kpi_outstanding"
  | "revenue_chart"
  | "health"
  | "insights"
  | "sales_by_category"
  | "low_stock"
  | "activity"
  | "quick_actions"
  | "my_tasks";

export const DASHBOARD_WIDGETS: Record<WidgetKey, Role[]> = {
  kpi_revenue: ["owner", "admin", "manager", "finance", "viewer"],
  kpi_orders: ["owner", "admin", "manager", "finance", "sales"],
  kpi_customers: ["owner", "admin", "manager", "sales"],
  kpi_outstanding: ["owner", "admin", "manager", "finance"],
  revenue_chart: ["owner", "admin", "manager", "finance", "viewer"],
  health: ["owner", "admin", "manager", "viewer"],
  insights: ["owner", "admin", "manager", "finance"],
  sales_by_category: ["owner", "admin", "manager", "finance", "viewer"],
  low_stock: ["owner", "admin", "manager", "sales"],
  activity: ["owner", "admin", "manager"],
  quick_actions: ["owner", "admin", "manager", "finance", "sales", "hr", "employee"],
  my_tasks: ["employee"],
};

export function canSeeWidget(role: Role, widget: WidgetKey): boolean {
  return DASHBOARD_WIDGETS[widget]?.includes(role) ?? false;
}

// ---------------------------------------------------------------------------
// Copilot tools → roles allowed to invoke them. The Copilot must never be a
// backdoor around the UI/RLS: it only exposes the tools a role may use, and
// refuses the rest politely. Mirrors module access. "Own data" tools are open
// to everyone (they scope to the asking user).
// ---------------------------------------------------------------------------

export const COPILOT_TOOLS: Record<string, Role[]> = {
  // Finance / analytics reads
  get_revenue: ["owner", "admin", "manager", "finance"],
  analyze_sales: ["owner", "admin", "manager", "finance"],
  generate_business_report: ["owner", "admin", "manager", "finance"],
  get_expenses: ["owner", "admin", "finance"],
  list_unpaid: ["owner", "admin", "manager", "finance"],
  get_business_health: ["owner", "admin", "manager"],
  // Finance writes
  create_invoice: ["owner", "admin", "manager", "finance", "sales"],
  create_quotation: ["owner", "admin", "manager", "finance", "sales"],
  record_payment: ["owner", "admin", "finance"],
  send_payment_reminder: ["owner", "admin", "manager", "finance"],
  // CRM
  create_customer: ["owner", "admin", "manager", "sales"],
  search_customers: ["owner", "admin", "manager", "sales"],
  // Inventory
  check_stock: ["owner", "admin", "manager", "sales"],
  update_stock: ["owner", "admin", "manager"],
  // Orders (cross-module workflow)
  create_order: ["owner", "admin", "manager", "sales"],
  // HR (everyone can ask about their own; full views are HR-only)
  attendance_today: ["owner", "admin", "hr", "manager"],
  employee_leave: ["owner", "admin", "hr"],
  payroll_summary: ["owner", "admin", "hr"],
  my_attendance: ["owner", "admin", "manager", "finance", "sales", "hr", "employee"],
  // Projects
  project_status: ["owner", "admin", "manager", "employee"],
  // Team administration (sensitive — owner/admin only)
  create_staff_account: ["owner", "admin"],
  // Universal (read-only, non-sensitive)
  search_knowledge: ["owner", "admin", "manager", "finance", "sales", "hr", "employee"],
  get_help: ["owner", "admin", "manager", "finance", "sales", "hr", "employee", "viewer"],
};

/** Which module a Copilot tool belongs to — used for the refusal message. */
export const TOOL_MODULE: Record<string, ModuleKey> = {
  get_revenue: "finance", analyze_sales: "analytics", generate_business_report: "finance",
  get_expenses: "finance", list_unpaid: "finance", get_business_health: "dashboard",
  create_invoice: "finance", create_quotation: "finance", record_payment: "finance",
  send_payment_reminder: "finance", create_customer: "crm", search_customers: "crm",
  check_stock: "inventory", update_stock: "inventory", create_order: "crm",
  attendance_today: "hr", employee_leave: "hr", payroll_summary: "hr", my_attendance: "hr",
  project_status: "projects", create_staff_account: "settings",
};

export function canUseTool(role: Role, tool: string): boolean {
  const allowed = COPILOT_TOOLS[tool];
  return allowed ? allowed.includes(role) : false;
}

/** Tool names a role may call. */
export function toolsForRole(role: Role): string[] {
  return Object.keys(COPILOT_TOOLS).filter((t) => COPILOT_TOOLS[t].includes(role));
}

// Suggested Copilot prompt chips, tuned to what each role actually does.
const SUGGESTIONS: Record<Role, string[]> = {
  owner: ["How's the business doing this month?", "Who hasn't paid yet?", "Record an order from Ananya Reddy — 2 Cane Lounge Chair", "Who's absent today?"],
  admin: ["How's the business doing this month?", "Who hasn't paid yet?", "Show this month's expenses", "Who's absent today?"],
  manager: ["Show this month's revenue", "How much stock of Oak Bookshelf is left?", "How are the projects going?", "Record an order from Ananya Reddy — 2 Cane Lounge Chair"],
  finance: ["Show this month's revenue", "Who hasn't paid yet?", "Show this month's expenses", "Record a payment for INV-2026-0007"],
  sales: ["How much stock of Oak Bookshelf is left?", "Record an order from Ananya Reddy — 2 Cane Lounge Chair", "Find customer Sterling Hotels", "Create a quotation for ABC Company"],
  hr: ["Who's absent today?", "How many leaves does Rohit Verma have left?", "What's the attendance today?", "What can I do here?"],
  employee: ["What's my attendance this month?", "How many leaves do I have left?", "How are the projects going?", "What can I do here?"],
  viewer: ["What is our return policy?", "What can I do here?"],
};

export function suggestionsForRole(role: Role): string[] {
  return SUGGESTIONS[role] ?? SUGGESTIONS.owner;
}
