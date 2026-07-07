"use client";

import * as React from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { Card } from "@/components/ui/card";
import { inr, cn } from "@/lib/utils";
import {
  TrendingUp, ShoppingCart, Users, Wallet, Boxes, ReceiptText,
} from "lucide-react";

interface Metrics {
  revenueThisMonth: number;
  revenueToday: number;
  ordersToday: number;
  ordersThisMonth: number;
  customerCount: number;
  outstanding: number;
  inventoryValue: number;
  lowStock: { name: string; stock_qty: number; threshold: number }[];
  healthScore: number;
}

const ICONS = { TrendingUp, ShoppingCart, Users, Wallet, Boxes, ReceiptText };

function Kpi({
  icon, label, value, sub, flash, tone = "default",
}: {
  icon: keyof typeof ICONS;
  label: string;
  value: string;
  sub: string;
  flash: boolean;
  tone?: "default" | "warning" | "danger";
}) {
  const Icon = ICONS[icon];
  const toneCls = { default: "text-foreground", warning: "text-warning", danger: "text-destructive" }[tone];
  return (
    <Card className={cn("p-5 transition-colors", flash && "animate-liveFlash")}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className={cn("num mt-2 font-sans text-3xl font-semibold tracking-tight", toneCls)}>{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
    </Card>
  );
}

export type KpiKey = "revenue" | "orders" | "customers" | "outstanding";

// `visible` selects which KPI cards render, so the dashboard can show only the
// ones a role is allowed to see. Defaults to all four (unchanged behaviour).
export function LiveKpis({
  initial,
  visible = ["revenue", "orders", "customers", "outstanding"],
}: {
  initial: Metrics;
  visible?: KpiKey[];
}) {
  const [m, setM] = React.useState(initial);
  const [flash, setFlash] = React.useState<Record<string, boolean>>({});
  const prev = React.useRef(initial);
  const show = (k: KpiKey) => visible.includes(k);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch("/api/metrics", { cache: "no-store" });
      if (!res.ok) return;
      const next: Metrics = await res.json();
      const changed: Record<string, boolean> = {};
      (["revenueThisMonth", "ordersToday", "customerCount", "outstanding", "inventoryValue"] as const).forEach((k) => {
        if (prev.current[k] !== next[k]) changed[k] = true;
      });
      if (prev.current.lowStock.length !== next.lowStock.length) changed.lowStock = true;
      if (Object.keys(changed).length) {
        setFlash(changed);
        setTimeout(() => setFlash({}), 1500);
      }
      prev.current = next;
      setM(next);
    } catch {
      /* ignore */
    }
  }, []);

  React.useEffect(() => {
    const sb = supabaseBrowser;
    if (sb) {
      const ch = sb
        .channel("dash-metrics")
        .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, load)
        .on("postgres_changes", { event: "*", schema: "public", table: "invoices" }, load)
        .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, load)
        .on("postgres_changes", { event: "*", schema: "public", table: "products" }, load)
        .subscribe();
      return () => {
        sb.removeChannel(ch);
      };
    }
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  const count = visible.length;
  const cols =
    count >= 4 ? "sm:grid-cols-2 xl:grid-cols-4" : count === 3 ? "sm:grid-cols-3" : count === 2 ? "sm:grid-cols-2" : "sm:grid-cols-1";

  return (
    <div className={`grid grid-cols-1 gap-4 ${cols}`}>
      {show("revenue") && (
        <Kpi icon="TrendingUp" label="Revenue this month" value={inr(m.revenueThisMonth)} sub={`${inr(m.revenueToday)} collected today`} flash={!!flash.revenueThisMonth} />
      )}
      {show("orders") && (
        <Kpi icon="ShoppingCart" label="Orders" value={String(m.ordersThisMonth)} sub={`${m.ordersToday} placed today`} flash={!!flash.ordersToday} />
      )}
      {show("customers") && (
        <Kpi icon="Users" label="Customers" value={String(m.customerCount)} sub="Total in your book" flash={!!flash.customerCount} />
      )}
      {show("outstanding") && (
        <Kpi
          icon="ReceiptText"
          label="Outstanding"
          value={inr(m.outstanding)}
          sub="Unpaid & overdue invoices"
          flash={!!flash.outstanding}
          tone={m.outstanding > 0 ? "warning" : "default"}
        />
      )}
    </div>
  );
}
