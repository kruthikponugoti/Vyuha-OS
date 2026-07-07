import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { all, byId, sum } from "@/lib/data";
import { PageHeader } from "@/components/shell/page-header";
import { StatCard } from "@/components/shell/stat-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { inr, formatDate, timeAgo } from "@/lib/utils";
import { ArrowLeft, Mail, Phone, MapPin, Building2, Receipt, ShoppingCart, Wallet } from "lucide-react";

export const dynamic = "force-dynamic";

const INV_STATUS: Record<string, "success" | "warning" | "danger" | "muted" | "primary"> = {
  paid: "success", sent: "primary", partial: "warning", overdue: "danger", draft: "muted",
};

export default async function CustomerDetail({ params }: { params: { id: string } }) {
  const session = (await getSession())!;
  const bid = session.business.id;
  const customer = await byId("customers", bid, params.id);
  if (!customer) notFound();

  const [orders, invoices, payments, deals] = await Promise.all([
    all("orders", bid),
    all("invoices", bid),
    all("payments", bid),
    all("deals", bid),
  ]);

  const custOrders = orders.filter((o) => o.customer_id === customer.id).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const custInvoices = invoices.filter((i) => i.customer_id === customer.id).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const custPayments = payments.filter((p) => p.customer_id === customer.id);
  const custDeals = deals.filter((d) => d.customer_id === customer.id);

  const outstanding = sum(custInvoices.filter((i) => i.type === "invoice" && i.status !== "paid"), (i) => i.total - i.amount_paid);

  const activity = [
    ...custOrders.map((o) => ({ at: o.created_at, icon: "order", text: `Order placed — ${inr(o.total)}`, sub: o.status })),
    ...custInvoices.map((i) => ({ at: i.created_at, icon: "invoice", text: `${i.type === "quotation" ? "Quotation" : "Invoice"} ${i.number} — ${inr(i.total)}`, sub: i.status })),
    ...custPayments.map((p) => ({ at: p.paid_at, icon: "payment", text: `Payment received — ${inr(p.amount)}`, sub: p.method })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return (
    <div>
      <PageHeader title={customer.name} description={customer.company ?? "Customer"}>
        <Button asChild variant="outline" size="sm">
          <Link href="/crm"><ArrowLeft className="h-4 w-4" /> Back to CRM</Link>
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 p-5 sm:p-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardHeader><CardTitle>Contact</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {customer.company && <Row icon={<Building2 className="h-4 w-4" />} value={customer.company} />}
              {customer.email && <Row icon={<Mail className="h-4 w-4" />} value={customer.email} />}
              {customer.phone && <Row icon={<Phone className="h-4 w-4" />} value={customer.phone} />}
              {(customer.address || customer.city) && (
                <Row icon={<MapPin className="h-4 w-4" />} value={[customer.address, customer.city].filter(Boolean).join(", ")} />
              )}
              {customer.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {customer.tags.map((t) => <Badge key={t} variant="muted" className="capitalize">{t}</Badge>)}
                </div>
              )}
              {customer.notes && <p className="border-t border-border pt-3 text-muted-foreground">{customer.notes}</p>}
            </CardContent>
          </Card>

          {custDeals.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Open deals</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {custDeals.map((d) => (
                  <div key={d.id} className="flex items-center justify-between text-sm">
                    <span className="truncate">{d.title}</span>
                    <span className="num shrink-0 font-medium">{inr(d.value)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6 lg:col-span-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Total spend" value={inr(customer.total_spend)} sub={`${custPayments.length} payments`} />
            <StatCard label="Orders" value={custOrders.length} sub="all time" />
            <StatCard label="Outstanding" value={inr(outstanding)} tone={outstanding > 0 ? "warning" : "default"} sub="unpaid invoices" />
          </div>

          <Card>
            <CardHeader><CardTitle>Invoices</CardTitle></CardHeader>
            <CardContent>
              {custInvoices.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">No invoices yet.</p>
              ) : (
                <div className="space-y-1">
                  {custInvoices.map((i) => (
                    <Link key={i.id} href={`/finance/invoices/${i.id}`} className="flex items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-accent/50">
                      <span className="font-medium">{i.number}</span>
                      <span className="flex items-center gap-3">
                        <span className="num">{inr(i.total)}</span>
                        <Badge variant={INV_STATUS[i.status]} className="capitalize">{i.status}</Badge>
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Activity</CardTitle></CardHeader>
            <CardContent>
              <ol className="space-y-3.5">
                {activity.slice(0, 12).map((a, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                      {a.icon === "order" ? <ShoppingCart className="h-3.5 w-3.5" /> : a.icon === "payment" ? <Wallet className="h-3.5 w-3.5" /> : <Receipt className="h-3.5 w-3.5" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">{a.text}</p>
                      <p className="text-xs capitalize text-muted-foreground">{a.sub} · {timeAgo(a.at)}</p>
                    </div>
                  </li>
                ))}
                {activity.length === 0 && <p className="text-sm text-muted-foreground">No activity yet.</p>}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-muted-foreground">{icon}</span>
      <span>{value}</span>
    </div>
  );
}
