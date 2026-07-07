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
