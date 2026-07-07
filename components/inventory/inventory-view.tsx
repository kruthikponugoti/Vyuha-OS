"use client";

import * as React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CrudTable } from "@/components/crud/crud-table";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { inr, formatDate, titleCase } from "@/lib/utils";
import type { Product, Supplier, Warehouse, Category, StockMovement, PurchaseOrder } from "@/lib/types";
import type { ForecastRow } from "@/lib/queries/inventory";
import type { ColumnDef, FieldDef } from "@/components/crud/types";
import { TrendingDown } from "lucide-react";

export function InventoryView({
  products, suppliers, warehouses, categories, movements, purchaseOrders, forecast, canWrite,
}: {
  products: Product[];
  suppliers: Supplier[];
  warehouses: Warehouse[];
  categories: Category[];
  movements: StockMovement[];
  purchaseOrders: PurchaseOrder[];
  forecast: ForecastRow[];
  canWrite: boolean;
}) {
  const catName = (id: string | null) => categories.find((c) => c.id === id)?.name ?? "—";
  const supName = (id: string | null) => suppliers.find((s) => s.id === id)?.name ?? "—";
  const whName = (id: string | null) => warehouses.find((w) => w.id === id)?.name ?? "—";
  const prodName = (id: string) => products.find((p) => p.id === id)?.name ?? "—";

  const productColumns: ColumnDef<Product>[] = [
    { key: "name", header: "Product", render: (r) => (
      <div>
        <div className="font-medium">{r.name}</div>
        <div className="text-xs text-muted-foreground">{r.sku} · {catName(r.category_id)}</div>
      </div>
    ) },
    { key: "stock_qty", header: "Stock", render: (r) => (
      <span className="num">{r.stock_qty}{r.stock_qty <= r.low_stock_threshold && <Badge variant="warning" className="ml-2">Low</Badge>}</span>
    ) },
    { key: "price", header: "Price", className: "text-right", render: (r) => <span className="num">{inr(r.price)}</span> },
    { key: "cost", header: "Cost", className: "text-right", render: (r) => <span className="num text-muted-foreground">{inr(r.cost)}</span> },
    { key: "barcode", header: "Barcode", render: (r) => <span className="num text-xs text-muted-foreground">{r.barcode ?? "—"}</span> },
  ];

  const productFields: FieldDef[] = [
    { name: "name", label: "Product name", required: true, full: true },
    { name: "sku", label: "SKU", required: true },
    { name: "barcode", label: "Barcode" },
    { name: "category_id", label: "Category", type: "select", options: categories.map((c) => ({ value: c.id, label: c.name })) },
    { name: "supplier_id", label: "Supplier", type: "select", options: suppliers.map((s) => ({ value: s.id, label: s.name })) },
    { name: "warehouse_id", label: "Warehouse", type: "select", options: warehouses.map((w) => ({ value: w.id, label: w.name })) },
    { name: "price", label: "Selling price (₹)", type: "number", required: true },
    { name: "cost", label: "Cost (₹)", type: "number" },
    { name: "stock_qty", label: "Stock quantity", type: "number", required: true },
    { name: "low_stock_threshold", label: "Reorder point", type: "number", defaultValue: 5 },
  ];

  const supplierColumns: ColumnDef<Supplier>[] = [
    { key: "name", header: "Supplier", render: (r) => <span className="font-medium">{r.name}</span> },
    { key: "contact_name", header: "Contact", render: (r) => r.contact_name ?? "—" },
    { key: "phone", header: "Phone", render: (r) => r.phone ?? "—" },
    { key: "city", header: "City", render: (r) => r.city ?? "—" },
  ];
  const supplierFields: FieldDef[] = [
    { name: "name", label: "Supplier name", required: true, full: true },
    { name: "contact_name", label: "Contact person" },
    { name: "phone", label: "Phone", type: "tel" },
    { name: "email", label: "Email", type: "email" },
    { name: "city", label: "City" },
  ];

  const warehouseColumns: ColumnDef<Warehouse>[] = [
    { key: "name", header: "Warehouse", render: (r) => <span className="font-medium">{r.name}</span> },
    { key: "location", header: "Location", render: (r) => r.location ?? "—" },
  ];
  const warehouseFields: FieldDef[] = [
    { name: "name", label: "Warehouse name", required: true },
    { name: "location", label: "Location" },
  ];

  const lowCount = products.filter((p) => p.stock_qty <= p.low_stock_threshold).length;

  return (
    <Tabs defaultValue="products" className="p-5 sm:p-8">
     <TabsList>
        <TabsTrigger value="products">Products ({products.length})</TabsTrigger>
        <TabsTrigger value="forecast">Forecast{lowCount > 0 ? ` (${lowCount})` : ""}</TabsTrigger>
        <TabsTrigger value="suppliers">Suppliers ({suppliers.length})</TabsTrigger>
        <TabsTrigger value="warehouses">Warehouses ({warehouses.length})</TabsTrigger>
        <TabsTrigger value="movements">Movements</TabsTrigger>
        <TabsTrigger value="po">Purchase Orders ({purchaseOrders.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="products">
        <CrudTable
          table="products" rows={products} columns={productColumns} fields={productFields}
          searchKeys={["name", "sku", "barcode"]}
          filters={[{ key: "category_id", label: "Category", options: categories.map((c) => ({ value: c.id, label: c.name })) }]}
          entityName="product" revalidate="/inventory" canWrite={canWrite} exportName="products"
          serialize={(v) => ({ ...v, price: Number(v.price) || 0, cost: Number(v.cost) || 0, stock_qty: Math.round(Number(v.stock_qty) || 0), low_stock_threshold: Math.round(Number(v.low_stock_threshold) || 5) })}
        />
      </TabsContent>

      <TabsContent value="forecast">
        <Card>
          <CardHeader>
            <CardTitle>Demand forecast</CardTitle>
            <CardDescription>Projected cover based on the last 8 weeks of sales. Sorted by urgency.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Product</TableHead>
                  <TableHead>In stock</TableHead>
                  <TableHead>Weekly sales</TableHead>
                  <TableHead>Days of cover</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {forecast.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.name}</TableCell>
                    <TableCell className="num">{f.stock_qty}</TableCell>
                    <TableCell className="num">{f.weeklyRate > 0 ? `${f.weeklyRate}/wk` : "—"}</TableCell>
                    <TableCell className="num">{f.daysCover !== null ? `${f.daysCover} days` : "—"}</TableCell>
                    <TableCell>
                      {f.reorder ? (
                        <Badge variant="warning"><TrendingDown className="h-3 w-3" /> Reorder soon</Badge>
                      ) : (
                        <Badge variant="success">Healthy</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="suppliers">
        <CrudTable table="suppliers" rows={suppliers} columns={supplierColumns} fields={supplierFields}
          searchKeys={["name", "contact_name", "city"]} entityName="supplier" revalidate="/inventory" canWrite={canWrite} exportName="suppliers" />
      </TabsContent>

      <TabsContent value="warehouses">
        <CrudTable table="warehouses" rows={warehouses} columns={warehouseColumns} fields={warehouseFields}
          searchKeys={["name", "location"]} entityName="warehouse" revalidate="/inventory" canWrite={canWrite} exportName="warehouses" />
      </TabsContent>

      <TabsContent value="movements">
        <Card>
          <CardHeader><CardTitle>Stock movement log</CardTitle><CardDescription>Every in, out and adjustment.</CardDescription></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Date</TableHead><TableHead>Product</TableHead><TableHead>Type</TableHead>
                  <TableHead>Qty</TableHead><TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...movements].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 40).map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(m.created_at)}</TableCell>
                    <TableCell className="font-medium">{prodName(m.product_id)}</TableCell>
                    <TableCell>
                      <Badge variant={m.type === "in" ? "success" : m.type === "out" ? "muted" : "warning"}>{titleCase(m.type)}</Badge>
                    </TableCell>
                    <TableCell className="num">{m.type === "out" ? "−" : m.type === "in" ? "+" : ""}{m.qty}</TableCell>
                    <TableCell className="text-muted-foreground">{m.reason}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="po">
        <div className="space-y-3">
          {purchaseOrders.map((po) => (
            <Card key={po.id}>
              <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{supName(po.supplier_id)}</span>
                    <Badge variant={po.status === "received" ? "success" : po.status === "cancelled" ? "danger" : "primary"} className="capitalize">{po.status}</Badge>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {po.items.map((it) => `${it.qty} × ${it.product_name}`).join(", ")}
                  </div>
                </div>
                <div className="text-right">
                  <div className="num font-semibold">{inr(po.total)}</div>
                  {po.expected_date && <div className="text-xs text-muted-foreground">Expected {formatDate(po.expected_date)}</div>}
                </div>
              </CardContent>
            </Card>
          ))}
          {purchaseOrders.length === 0 && <p className="text-sm text-muted-foreground">No purchase orders yet.</p>}
        </div>
      </TabsContent>
    </Tabs>
  );
}
