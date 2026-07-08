import { getSession } from "@/lib/auth";
import { getDashboardData } from "@/lib/queries/dashboard";
import { realMode } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ error: "unauthorised" }, { status: 401 });
  const data = await getDashboardData(session.business.id, session.business.timezone);
  return Response.json({
    revenueThisMonth: data.revenueThisMonth,
    revenueToday: data.revenueToday,
    ordersToday: data.ordersToday,
    ordersThisMonth: data.ordersThisMonth,
    customerCount: data.customerCount,
    outstanding: data.outstanding,
    inventoryValue: data.inventoryValue,
    lowStock: data.lowStock,
    healthScore: data.healthScore,
    realtime: realMode(),
  });
}
