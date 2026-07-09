import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { all, byId } from "@/lib/data";
import { PageHeader } from "@/components/shell/page-header";
import { StatCard } from "@/components/shell/stat-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { inr, timeAgo } from "@/lib/utils";
import { ArrowLeft, ArrowDownToLine, ArrowUpFromLine, Settings2, Package, Barcode, Tag, Truck, Warehouse } from "lucide-react";
import type { StockMovement, Category, Supplier, Warehouse as Wh, PurchaseOrder } from "@/lib/types";

export const dynamic = "force-dynamic";

const MOVE_ICON = {
  in: <ArrowDownToLine className="h-3.5 w-3.5" />,
  out: <ArrowUpFromLine className="h-3.5 w-3.5" />,
  adjustment: <Settings2 className="h-3.5 w-3.5" />,
} as const;

export default async function ProductDetail({ params }: { params: { id: string } }) {
  const session = (await getSession())!;
  const bid = session.business.id;
  const product = await byId("products", bid, params.id);
  if (!product) notFound();

  const [categories, suppliers, warehouses, movements, purchaseOrders] = await Promise.all([
    all("categories", bid),
    all("suppliers", bid),
    all("warehouses", bid),
    all("stock_movements", bid),
    all("purchase_orders", bid),
  ]);

  const category = (categories as Category[]).find((c) => c.id === product.category_id);
  const supplier = (suppliers as Supplier[]).find((s) => s.id === product.supplier_id);
  const warehouse = (warehouses as Wh[]).find((w) => w.id === product.warehouse_id);

  const productMoves = (movements as StockMovement[])
    .filter((m) => m.product_id === product.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const relatedPos = (purchaseOrders as PurchaseOrder[])
    .filter((po) => po.items.some((it) => it.product_id === product.id))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const margin = product.price > 0 ? Math.round(((product.price - product.cost) / product.price) * 100) : 0;
  const low = product.stock_qty <= product.low_stock_threshold;

  return (
    <div>
      <PageHeader title={product.name} description={`SKU ${product.sku}`}>
        <Button asChild variant="outline" size="sm">
          <Link href="/inventory"><ArrowLeft className="h-4 w-4" /> Back to inventory</Link>
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 p-5 sm:p-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardHeader><CardTitle>Details</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row icon={<Package className="h-4 w-4" />} label="SKU" value={product.sku} />
              {product.barcode && <Row icon={<Barcode className="h-4 w-4" />} label="Barcode" value={product.barcode} />}
              {category && <Row icon={<Tag className="h-4 w-4" />} label="Category" value={category.name} />}
              {supplier && <Row icon={<Truck className="h-4 w-4" />} label="Supplier" value={supplier.name} />}
              {warehouse && <Row icon={<Warehouse className="h-4 w-4" />} label="Warehouse" value={warehouse.name} />}
              {product.description && <p className="border-t border-border pt-3 text-muted-foreground">{product.description}</p>}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="In stock" value={product.stock_qty} sub={low ? `below ${product.low_stock_threshold}` : "healthy"} tone={low ? "warning" : "default"} />
            <StatCard label="Price" value={inr(product.price)} sub={`cost ${inr(product.cost)}`} />
            <StatCard label="Margin" value={`${margin}%`} sub="per unit" />
            <StatCard label="Stock value" value={inr(product.stock_qty * product.cost)} sub="at cost" />
          </div>

          <Card>
            <CardHeader><CardTitle>Stock movements</CardTitle></CardHeader>
            <CardContent>
              {productMoves.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">No stock movements recorded yet.</p>
              ) : (
                <ol className="space-y-3.5">
                  {productMoves.slice(0, 15).map((m) => (
                    <li key={m.id} className="flex gap-3">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                        {MOVE_ICON[m.type]}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">
                          <span className="capitalize font-medium">{m.type}</span> · <span className="num">{m.type === "out" ? "−" : "+"}{Math.abs(m.qty)}</span> {m.reason && <span className="text-muted-foreground">— {m.reason}</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">{m.reference ? `${m.reference} · ` : ""}{timeAgo(m.created_at)}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>

          {relatedPos.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Purchase orders</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                {relatedPos.map((po) => {
                  const line = po.items.find((it) => it.product_id === product.id)!;
                  return (
                    <div key={po.id} className="flex items-center justify-between rounded-md px-2 py-2 text-sm">
                      <span className="flex items-center gap-2">
                        <Badge variant={po.status === "received" ? "success" : po.status === "cancelled" ? "muted" : "primary"} className="capitalize">{po.status}</Badge>
                        <span className="text-muted-foreground">{timeAgo(po.created_at)}</span>
                      </span>
                      <span className="num">{line.qty} @ {inr(line.cost)}</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto font-medium">{value}</span>
    </div>
  );
}
