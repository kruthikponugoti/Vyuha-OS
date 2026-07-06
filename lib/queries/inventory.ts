import { all } from "@/lib/data";
import type { Product, StockMovement } from "@/lib/types";

export interface ForecastRow {
  id: string;
  name: string;
  stock_qty: number;
  threshold: number;
  weeklyRate: number; // avg units sold per week (last 8 weeks)
  daysCover: number | null; // days until stock-out at current rate
  reorder: boolean;
}

export async function getDemandForecast(businessId: string): Promise<ForecastRow[]> {
  const [products, movements] = await Promise.all([
    all("products", businessId),
    all("stock_movements", businessId),
  ]);
  const cutoff = Date.now() - 56 * 86400000; // 8 weeks
  const outByProduct: Record<string, number> = {};
  for (const m of movements as StockMovement[]) {
    if (m.type === "out" && new Date(m.created_at).getTime() >= cutoff) {
      outByProduct[m.product_id] = (outByProduct[m.product_id] || 0) + m.qty;
    }
  }
  return (products as Product[])
    .map((p) => {
      const totalOut = outByProduct[p.id] || 0;
      const weeklyRate = totalOut / 8;
      const dailyRate = weeklyRate / 7;
      const daysCover = dailyRate > 0 ? Math.round(p.stock_qty / dailyRate) : null;
      return {
        id: p.id,
        name: p.name,
        stock_qty: p.stock_qty,
        threshold: p.low_stock_threshold,
        weeklyRate: Math.round(weeklyRate * 10) / 10,
        daysCover,
        reorder: p.stock_qty <= p.low_stock_threshold || (daysCover !== null && daysCover < 14),
      };
    })
    .sort((a, b) => {
      const ax = a.daysCover ?? Infinity;
      const bx = b.daysCover ?? Infinity;
      return ax - bx;
    });
}
