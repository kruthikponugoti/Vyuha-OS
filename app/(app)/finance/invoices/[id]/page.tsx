import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession, canWrite } from "@/lib/auth";
import { all, byId } from "@/lib/data";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InvoiceActions } from "@/components/finance/invoice-actions";
import { inr, formatDate, cn } from "@/lib/utils";
import { VyuhaMark } from "@/components/brand";
import { ArrowLeft } from "lucide-react";
import type { InvoiceDoc } from "@/lib/invoice-pdf";

export const dynamic = "force-dynamic";

const STATUS: Record<string, "success" | "warning" | "danger" | "muted" | "primary"> = {
  paid: "success", sent: "primary", partial: "warning", overdue: "danger", draft: "muted",
};

export default async function InvoiceDetail({ params }: { params: { id: string } }) {
  const session = (await getSession())!;
  const bid = session.business.id;
  const invoice = await byId("invoices", bid, params.id);
  if (!invoice) notFound();

  const [customer, orderItems, products, invoiceItems] = await Promise.all([
    byId("customers", bid, invoice.customer_id),
    all("order_items", bid),
    all("products", bid),
    all("invoice_items" as any, bid).catch(() => [] as any[]),
  ]);

  const prodName = (id: string) => products.find((p) => p.id === id)?.name ?? "Item";
  let items: { name: string; qty: number; price: number }[] = [];

  // 1. Try invoice_items table first (new: persisted line items)
  const invItems = (invoiceItems as any[]).filter((it: any) => it.invoice_id === invoice.id);
  if (invItems.length > 0) {
    items = invItems.map((it: any) => ({ name: it.product_name ?? prodName(it.product_id), qty: it.qty, price: it.price }));
  }
  // 2. Fallback: load from order_items if linked to an order
  if (items.length === 0 && invoice.order_id) {
    items = orderItems
      .filter((it) => it.order_id === invoice.order_id)
      .map((it) => ({ name: prodName(it.product_id), qty: it.qty, price: it.price }));
  }
  // 3. Last resort: single summary line
  if (items.length === 0) {
    items = [{ name: invoice.notes || "Goods & services", qty: 1, price: invoice.subtotal }];
  }

  const outstanding = invoice.total - invoice.amount_paid;
  const doc: InvoiceDoc = {
    number: invoice.number,
    type: invoice.type,
    status: invoice.status,
    issue_date: formatDate(invoice.issue_date),
    due_date: formatDate(invoice.due_date),
    business: { name: session.business.name, city: `${session.business.country}`, currency: session.business.currency },
    customer: customer ?? { name: "Customer" },
    items,
    subtotal: invoice.subtotal,
    tax_rate: invoice.tax_rate,
    tax_amount: invoice.tax_amount,
    total: invoice.total,
    amount_paid: invoice.amount_paid,
    notes: invoice.notes,
  };

  return (
    <div>
      <div className="print-hidden">
        <PageHeader title={invoice.number} description={`${invoice.type === "quotation" ? "Quotation" : "Invoice"} for ${customer?.name ?? ""}`}>
          <Button asChild variant="outline" size="sm">
            <Link href="/finance"><ArrowLeft className="h-4 w-4" /> Back</Link>
          </Button>
          <InvoiceActions doc={doc} invoiceId={invoice.id} outstanding={outstanding} canRecordPayment={canWrite(session.user.role, "payments")} />
        </PageHeader>
      </div>

      <div className="mx-auto max-w-3xl p-5 sm:p-8">
        <div className="rounded-card border border-border bg-card p-5 shadow-card print:border-0 print:shadow-none sm:p-10">
          <div className="flex items-start justify-between border-b border-border pb-8">
            <div>
              <div className="flex items-center gap-2">
                <VyuhaMark className="h-5 w-5 text-ink-800 dark:text-foreground" />
                <span className="font-display text-lg font-semibold">{session.business.name}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{session.business.industry} · {session.business.country}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {invoice.type === "quotation" ? "Quotation" : "Invoice"}
              </p>
              <p className="num mt-1 font-semibold">#{invoice.number}</p>
              <p className="mt-1 text-sm text-muted-foreground">{formatDate(invoice.issue_date)}</p>
            </div>
          </div>

          <div className="flex items-start justify-between py-8">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Billed to</p>
              <p className="mt-2 font-medium">{customer?.name}</p>
              {customer?.company && <p className="text-sm text-muted-foreground">{customer.company}</p>}
              {customer?.email && <p className="text-sm text-muted-foreground">{customer.email}</p>}
              {customer?.phone && <p className="text-sm text-muted-foreground">{customer.phone}</p>}
            </div>
            <Badge variant={STATUS[invoice.status]} className="capitalize">{invoice.status}</Badge>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-[0.08em] text-muted-foreground">
                <th className="pb-3 font-medium">Item</th>
                <th className="pb-3 text-right font-medium">Qty</th>
                <th className="pb-3 text-right font-medium">Unit price</th>
                <th className="pb-3 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i} className="border-b border-border">
                  <td className="py-3 font-medium">{it.name}</td>
                  <td className="num py-3 text-right text-muted-foreground">{it.qty}</td>
                  <td className="num py-3 text-right text-muted-foreground">{inr(it.price)}</td>
                  <td className="num py-3 text-right font-medium">{inr(it.price * it.qty)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-6 flex justify-end">
            <div className="w-full max-w-xs space-y-2 text-sm">
              <Row label="Subtotal" value={inr(invoice.subtotal)} />
              <Row label={`Tax (${invoice.tax_rate}%)`} value={inr(invoice.tax_amount)} />
              {invoice.amount_paid > 0 && <Row label="Paid" value={`− ${inr(invoice.amount_paid)}`} />}
              <div className="flex items-center justify-between border-t border-border pt-2.5">
                <span className="font-medium">Total due</span>
                <span className="num font-display text-xl font-semibold">{inr(outstanding)}</span>
              </div>
            </div>
          </div>

          <p className="mt-10 border-t border-border pt-6 text-xs leading-relaxed text-muted-foreground">
            Generated by Vyuha OS. Please make payment within 7 days of the invoice date. Thank you for your business.
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="num">{value}</span>
    </div>
  );
}
