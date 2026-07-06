import type { Metadata } from "next";
import { getSession, canWrite } from "@/lib/auth";
import { all } from "@/lib/data";
import { getDemandForecast } from "@/lib/queries/inventory";
import { PageHeader } from "@/components/shell/page-header";
import { InventoryView } from "@/components/inventory/inventory-view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Inventory" };

export default async function InventoryPage() {
  const session = (await getSession())!;
  const bid = session.business.id;
  const [products, suppliers, warehouses, categories, movements, purchaseOrders, forecast] = await Promise.all([
    all("products", bid),
    all("suppliers", bid),
    all("warehouses", bid),
    all("categories", bid),
    all("stock_movements", bid),
    all("purchase_orders", bid),
    getDemandForecast(bid),
  ]);

  return (
    <div>
      <PageHeader title="Inventory" description="Products, suppliers, stock movements and purchase orders." />
      <InventoryView
        products={products.sort((a, b) => a.name.localeCompare(b.name))}
        suppliers={suppliers}
        warehouses={warehouses}
        categories={categories}
        movements={movements}
        purchaseOrders={purchaseOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())}
        forecast={forecast}
        canWrite={canWrite(session.user.role, "products")}
      />
    </div>
  );
}
