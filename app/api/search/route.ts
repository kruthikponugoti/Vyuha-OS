// Global search across customers, products, invoices, projects and documents.
// Scoped to the caller's business via the session.

import { getSession } from "@/lib/auth";
import { all } from "@/lib/data";

export const dynamic = "force-dynamic";

export interface SearchHit {
  type: "customer" | "product" | "invoice" | "project" | "document" | "employee";
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ hits: [] }, { status: 401 });

  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().toLowerCase();
  if (q.length < 1) return Response.json({ hits: [] });

  const bid = session.business.id;
  const canSeePeople = ["owner", "admin", "hr", "manager"].includes(session.user.role);
  const [customers, products, invoices, projects, documents, employees] = await Promise.all([
    all("customers", bid),
    all("products", bid),
    all("invoices", bid),
    all("projects", bid),
    all("documents", bid),
    canSeePeople ? all("employees", bid) : Promise.resolve([]),
  ]);

  const hits: SearchHit[] = [];
  const match = (s?: string | null) => s?.toLowerCase().includes(q);

  for (const c of customers) {
    if (match(c.name) || match(c.company) || match(c.email) || match(c.phone)) {
      hits.push({
        type: "customer",
        id: c.id,
        title: c.name,
        subtitle: c.company || c.email || c.city || "Customer",
        href: `/crm/customers/${c.id}`,
      });
    }
  }
  for (const p of products) {
    if (match(p.name) || match(p.sku) || match(p.barcode)) {
      hits.push({
        type: "product",
        id: p.id,
        title: p.name,
        subtitle: `${p.sku} · ${p.stock_qty} in stock`,
        href: `/inventory/products/${p.id}`,
      });
    }
  }
  for (const i of invoices) {
    if (match(i.number)) {
      hits.push({
        type: "invoice",
        id: i.id,
        title: i.number,
        subtitle: `${i.type} · ${i.status}`,
        href: `/finance/invoices/${i.id}`,
      });
    }
  }
  for (const pr of projects) {
    if (match(pr.name) || match(pr.description)) {
      hits.push({
        type: "project",
        id: pr.id,
        title: pr.name,
        subtitle: `Project · ${pr.status}`,
        href: `/projects/${pr.id}`,
      });
    }
  }
  for (const d of documents) {
    if (match(d.name)) {
      hits.push({
        type: "document",
        id: d.id,
        title: d.name,
        subtitle: `Document · ${d.type.replace(/_/g, " ")}`,
        href: `/documents`,
      });
    }
  }
  for (const e of employees) {
    if (match(e.name) || match(e.designation) || match(e.department) || match(e.email)) {
      hits.push({
        type: "employee",
        id: e.id,
        title: e.name,
        subtitle: `${e.designation || "Employee"} · ${e.department}`,
        href: `/hr`,
      });
    }
  }

  return Response.json({ hits: hits.slice(0, 20) });
}
