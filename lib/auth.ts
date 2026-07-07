// Session resolution for server components and route handlers.
//
// Real mode (Supabase keys set): reads the Supabase auth cookie and maps the
// auth user to their `users` profile row + business.
// Demo mode: a signed-in demo session whose role comes from the
// `vyuha-demo-role` cookie, so RBAC is exercisable without real auth.

import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { getDb, isDemoRequest, DEMO_BUSINESS_ID, DEMO_AUTH_COOKIE, DEMO_ROLE_COOKIE } from "./db";
import type { Business, Role, User } from "./types";
import { ROLES } from "./types";

export interface Session {
  user: User;
  business: Business;
  demo: boolean;
}

// Re-exported for callers that imported them from here historically.
export { DEMO_AUTH_COOKIE, DEMO_ROLE_COOKIE };

export function supabaseServer() {
  const store = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (list: { name: string; value: string; options: CookieOptions }[]) => {
          try {
            list.forEach(({ name, value, options }) => store.set(name, value, options));
          } catch {
            // called from a Server Component — middleware handles refresh
          }
        },
      },
    }
  );
}

export async function getSession(): Promise<Session | null> {
  const db = getDb();

  if (isDemoRequest()) {
    // Demo session: driven by the role-picker cookies. Works whether or not a
    // real Supabase project is configured (hybrid mode).
    if (!cookies().get(DEMO_AUTH_COOKIE)) return null;
    const roleCookie = cookies().get(DEMO_ROLE_COOKIE)?.value as Role | undefined;
    const role: Role = roleCookie && ROLES.includes(roleCookie) ? roleCookie : "owner";
    const { data: user } = await db
      .from("users")
      .select("*")
      .eq("business_id", DEMO_BUSINESS_ID)
      .eq("role", role)
      .limit(1)
      .maybeSingle();
    const { data: business } = await db
      .from("businesses")
      .select("*")
      .eq("id", DEMO_BUSINESS_ID)
      .single();
    if (!user || !business) return null;
    return { user: user as User, business: business as Business, demo: true };
  }

  const supabase = supabaseServer();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("auth_id", authUser.id)
    .maybeSingle();
  if (!profile) return null;

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", profile.business_id)
    .single();
  if (!business) return null;

  return { user: profile as User, business: business as Business, demo: false };
}

// ---------------------------------------------------------------------------
// Role-based permissions — single source of truth for UI gating.
// Mirrors the RLS write matrix in supabase/schema.sql.
// ---------------------------------------------------------------------------

export const WRITE_ROLES: Record<string, Role[]> = {
  customers: ["owner", "admin", "manager", "sales"],
  leads: ["owner", "admin", "manager", "sales"],
  deals: ["owner", "admin", "manager", "sales"],
  categories: ["owner", "admin", "manager"],
  suppliers: ["owner", "admin", "manager"],
  warehouses: ["owner", "admin", "manager"],
  products: ["owner", "admin", "manager", "employee"],
  stock_movements: ["owner", "admin", "manager", "employee"],
  purchase_orders: ["owner", "admin", "manager"],
  orders: ["owner", "admin", "manager", "sales"],
  order_items: ["owner", "admin", "manager", "sales"],
  invoices: ["owner", "admin", "manager", "finance", "sales"],
  payments: ["owner", "admin", "finance"],
  expenses: ["owner", "admin", "finance"],
  employees: ["owner", "admin", "hr"],
  attendance: ["owner", "admin", "hr"],
  leave_requests: ["owner", "admin", "hr", "manager", "employee", "finance", "sales"],
  payroll: ["owner", "admin", "hr"],
  projects: ["owner", "admin", "manager"],
  tasks: ["owner", "admin", "manager", "employee", "sales", "finance", "hr"],
  documents: ["owner", "admin", "manager", "finance", "hr"],
  knowledge_base_files: ["owner", "admin", "manager"],
  settings: ["owner", "admin"],
  team: ["owner", "admin"],
};

export function canWrite(role: Role, table: string): boolean {
  return (WRITE_ROLES[table] ?? ["owner", "admin"]).includes(role);
}
