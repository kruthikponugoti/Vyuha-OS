"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createInvoiceAction } from "@/app/(app)/finance/actions";
import { inr } from "@/lib/utils";
import { toast } from "sonner";
import { Plus, Trash2, FileText } from "lucide-react";
import type { Customer, Product } from "@/lib/types";

export function InvoiceComposer({
  customers,
  products,
  type,
  trigger,
}: {
  customers: Customer[];
  products: Product[];
  type: "invoice" | "quotation";
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [customerId, setCustomerId] = React.useState("");
  const [lines, setLines] = React.useState<{ productId: string; qty: number }[]>([{ productId: "", qty: 1 }]);
  const [saving, setSaving] = React.useState(false);

  const prod = (id: string) => products.find((p) => p.id === id);
  const total = lines.reduce((s, l) => s + (prod(l.productId)?.price ?? 0) * l.qty, 0);

  function reset() {
    setCustomerId("");
    setLines([{ productId: "", qty: 1 }]);
  }

  async function submit() {
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) return toast.error("Choose a customer.");
    const items = lines.filter((l) => l.productId).map((l) => ({ product_name: prod(l.productId)!.name, qty: l.qty }));
    if (!items.length) return toast.error("Add at least one item.");
    setSaving(true);
    const res = await createInvoiceAction({ customer_name: customer.name, items, type });
    setSaving(false);
    if (res.ok) {
      toast.success(`${type === "quotation" ? "Quotation" : "Invoice"} ${res.number} created.`);
      setOpen(false);
      reset();
      router.push(`/finance/invoices/${res.id}`);
    } else {
      toast.error(res.error ?? "Failed.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus className="h-4 w-4" /> New {type}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New {type}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="mb-1.5 block">Customer</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger><SelectValue placeholder="Choose a customer" /></SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}{c.company ? ` · ${c.company}` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-1.5 block">Items</Label>
            <div className="space-y-2">
              {lines.map((line, i) => (
                <div key={i} className="flex gap-2">
                  <Select value={line.productId} onValueChange={(v) => setLines((p) => p.map((l, j) => (j === i ? { ...l, productId: v } : l)))}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Product" /></SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name} — {inr(p.price)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number" min={1} value={line.qty}
                    onChange={(e) => setLines((p) => p.map((l, j) => (j === i ? { ...l, qty: Math.max(1, Number(e.target.value) || 1) } : l)))}
                    className="w-20"
                  />
                  <Button variant="ghost" size="icon" onClick={() => setLines((p) => p.filter((_, j) => j !== i))} disabled={lines.length === 1} aria-label="Remove line">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => setLines((p) => [...p, { productId: "", qty: 1 }])}>
              <Plus className="h-4 w-4" /> Add item
            </Button>
          </div>

          <div className="flex items-center justify-between rounded-md bg-secondary/50 px-3 py-2.5">
            <span className="text-sm text-muted-foreground">Total (incl. tax)</span>
            <span className="num text-lg font-semibold">{inr(total)}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            <FileText className="h-4 w-4" /> {saving ? "Creating…" : `Create ${type}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
