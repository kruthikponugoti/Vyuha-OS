// Single source of industry-specific presentation. The data model is shared;
// only terminology, KPI labels, quick-action labels and suggested Copilot
// prompts change per industry. Keyed by the `businesses.industry` value set at
// onboarding (see components/auth/onboarding-wizard.tsx).
//
// Nothing here touches the schema — a "Patient" is still a row in `customers`,
// a "Menu Item" is still a row in `products`. This keeps one codebase behind
// nine presentations.

import type { KpiKey } from "@/components/dashboard/live-kpis";

export interface IndustryTerms {
  customer: string;
  customers: string;
  product: string;
  products: string;
  order: string;
  orders: string;
  invoice: string;
  invoices: string;
  inventory: string; // the stock/catalogue module
  supplier: string;
  suppliers: string;
}

export interface IndustryConfig {
  key: string;
  label: string;
  tagline: string;
  terms: IndustryTerms;
  /** Per-KPI label overrides for the dashboard (falls back to the base label). */
  kpiLabels: Partial<Record<KpiKey, string>>;
  /** Quick-action label overrides, keyed by the action's module. */
  actionLabels: Partial<Record<"finance" | "crm" | "inventory", string>>;
  /** Industry-flavoured Copilot suggestions (blended with role-specific ones). */
  prompts: string[];
}

const BASE_TERMS: IndustryTerms = {
  customer: "Customer", customers: "Customers",
  product: "Product", products: "Products",
  order: "Order", orders: "Orders",
  invoice: "Invoice", invoices: "Invoices",
  inventory: "Inventory",
  supplier: "Supplier", suppliers: "Suppliers",
};

type IndustryOverride = {
  label: string;
  tagline: string;
  terms?: Partial<IndustryTerms>;
  kpiLabels?: Partial<Record<KpiKey, string>>;
  actionLabels?: Partial<Record<"finance" | "crm" | "inventory", string>>;
  prompts: string[];
};

// Keys match the onboarding INDUSTRIES list exactly.
const OVERRIDES: Record<string, IndustryOverride> = {
  Retail: {
    label: "Retail",
    tagline: "Store operations at a glance",
    prompts: ["What were sales today?", "Which products are low on stock?", "Show unpaid invoices"],
  },
  Restaurants: {
    label: "Restaurant",
    tagline: "Service, menu and stock at a glance",
    terms: { customer: "Guest", customers: "Guests", product: "Menu Item", products: "Menu Items", inventory: "Ingredients" },
    kpiLabels: { revenue: "Sales this month", orders: "Covers", customers: "Guests" },
    actionLabels: { inventory: "Update menu", crm: "Add guest" },
    prompts: ["What were today's sales?", "Which ingredients are running low?", "What are the top-selling items?", "Who's on shift today?"],
  },
  Healthcare: {
    label: "Healthcare",
    tagline: "Patients, appointments and supplies",
    terms: { customer: "Patient", customers: "Patients", product: "Item", products: "Supplies", order: "Appointment", orders: "Appointments", invoice: "Bill", invoices: "Bills", inventory: "Pharmacy" },
    kpiLabels: { orders: "Appointments today", customers: "Patients", outstanding: "Outstanding bills" },
    actionLabels: { crm: "Add patient", finance: "New bill", inventory: "Update supplies" },
    prompts: ["How many appointments today?", "Which supplies are low?", "Who's on duty today?", "Show outstanding patient bills"],
  },
  Education: {
    label: "Education",
    tagline: "Students, enrolment and fees",
    terms: { customer: "Student", customers: "Students", product: "Course", products: "Courses", order: "Enrolment", orders: "Enrolments", invoice: "Fee", invoices: "Fees" },
    kpiLabels: { orders: "Enrolments", customers: "Students", outstanding: "Fees due" },
    actionLabels: { crm: "Add student", finance: "Raise fee", inventory: "Update courses" },
    prompts: ["How many students enrolled this month?", "Which fees are unpaid?", "Who's absent today?", "Show course capacity"],
  },
  Manufacturing: {
    label: "Manufacturing",
    tagline: "Production, materials and dispatch",
    terms: { customer: "Client", customers: "Clients", order: "Production Order", orders: "Production Orders", product: "Product", products: "Products", inventory: "Raw Materials" },
    kpiLabels: { orders: "Production orders", revenue: "Revenue this month" },
    actionLabels: { inventory: "Update materials", crm: "Add client" },
    prompts: ["What's in production right now?", "Which raw materials are low?", "Show open purchase orders", "What shipped this week?"],
  },
  Agencies: {
    label: "Agency",
    tagline: "Clients, projects and billing",
    terms: { customer: "Client", customers: "Clients", product: "Service", products: "Services", order: "Engagement", orders: "Engagements" },
    kpiLabels: { orders: "Active projects", customers: "Clients", outstanding: "Unbilled & unpaid" },
    actionLabels: { crm: "Add client", inventory: "Update services" },
    prompts: ["Which projects are active?", "Show unpaid invoices", "What's due this week?", "Which clients haven't paid?"],
  },
  Construction: {
    label: "Construction",
    tagline: "Jobs, materials and clients",
    terms: { customer: "Client", customers: "Clients", product: "Material", products: "Materials", order: "Job", orders: "Jobs", inventory: "Materials" },
    kpiLabels: { orders: "Jobs in progress", customers: "Clients" },
    actionLabels: { inventory: "Update materials", crm: "Add client" },
    prompts: ["Which jobs are in progress?", "Which materials are low?", "Show outstanding client payments", "What's due this week?"],
  },
  Hospitality: {
    label: "Hospitality",
    tagline: "Guests, bookings and service",
    terms: { customer: "Guest", customers: "Guests", product: "Service", products: "Services", order: "Booking", orders: "Bookings" },
    kpiLabels: { orders: "Bookings", customers: "Guests" },
    actionLabels: { crm: "Add guest", inventory: "Update services" },
    prompts: ["How many bookings this month?", "Which supplies are low?", "Who's on shift today?", "Show outstanding balances"],
  },
  "Professional Services": {
    label: "Professional Services",
    tagline: "Clients, engagements and billing",
    terms: { customer: "Client", customers: "Clients", product: "Service", products: "Services", order: "Engagement", orders: "Engagements" },
    kpiLabels: { orders: "Engagements", customers: "Clients", outstanding: "Unbilled & unpaid" },
    actionLabels: { crm: "Add client", inventory: "Update services" },
    prompts: ["Which engagements are active?", "Show unpaid invoices", "What's billable this month?", "Which clients haven't paid?"],
  },
  Wholesale: {
    label: "Wholesale",
    tagline: "Buyers, stock and orders",
    terms: { customer: "Buyer", customers: "Buyers", order: "Order", orders: "Orders" },
    kpiLabels: { customers: "Buyers" },
    actionLabels: { crm: "Add buyer" },
    prompts: ["What were sales today?", "Which products are low on stock?", "Show unpaid invoices", "Who are the top buyers?"],
  },
};

const RETAIL = OVERRIDES.Retail;

export function industryConfig(industry: string | null | undefined): IndustryConfig {
  const o = (industry && OVERRIDES[industry]) || RETAIL;
  return {
    key: industry || "Retail",
    label: o.label,
    tagline: o.tagline,
    terms: { ...BASE_TERMS, ...(o.terms ?? {}) },
    kpiLabels: o.kpiLabels ?? {},
    actionLabels: o.actionLabels ?? {},
    prompts: o.prompts,
  };
}

/** Convenience: one term for a given industry. */
export function term(industry: string | null | undefined, key: keyof IndustryTerms): string {
  return industryConfig(industry).terms[key];
}

/** The industry list offered at onboarding (kept in sync with the wizard). */
export const INDUSTRIES = Object.keys(OVERRIDES);
