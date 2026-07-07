import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getDashboardData, getRecentActivity } from "@/lib/queries/dashboard";
import { PageHeader } from "@/components/shell/page-header";
import { LiveKpis } from "@/components/dashboard/live-kpis";
import { HealthRing } from "@/components/dashboard/health-ring";
import { RevenueAreaChart, DonutChart } from "@/components/charts/charts";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shell/empty-state";
import { inr, timeAgo, cn } from "@/lib/utils";
import {
  Sparkles, Lightbulb, TriangleAlert, TrendingUp, ArrowRight, Package,
  Plus, FileText, UserPlus, Boxes, Activity,
} from "lucide-react";

export const dynamic = "force-dynamic";

const INSIGHT_ICON = { good: TrendingUp, watch: Lightbulb, alert: TriangleAlert };
const INSIGHT_CLS = {
  good: "text-success bg-success-soft",
  watch: "text-warning bg-warning-soft",
  alert: "text-destructive bg-destructive-soft",
};

const QUICK_ACTIONS = [
  { label: "Ask the Copilot", href: "/copilot", icon: Sparkles },
  { label: "New invoice", href: "/finance/invoices?new=1", icon: FileText },
  { label: "Add customer", href: "/crm/customers?new=1", icon: UserPlus },
  { label: "Update stock", href: "/inventory?new=1", icon: Boxes },
];

export default async function DashboardPage() {
  const session = (await getSession())!;
  const [data, activity] = await Promise.all([
    getDashboardData(session.business.id),
    getRecentActivity(session.business.id),
  ]);

  const revDelta =
    data.revenuePrevMonth > 0
      ? ((data.revenueThisMonth - data.revenuePrevMonth) / data.revenuePrevMonth) * 100
      : 0;

  return (
    <div>
      <PageHeader
        title={`Good day, ${session.user.name.split(" ")[0]}`}
        description="Here's how your business is doing today."
      >
        <Button asChild variant="outline" size="sm">
          <Link href="/analytics">View analytics</Link>
        </Button>
        <Button asChild size="sm">
          <Link href="/copilot">
            <Sparkles className="h-4 w-4" /> Ask the Copilot
          </Link>
        </Button>
      </PageHeader>

      <div className="space-y-6 p-5 sm:p-8">
        <LiveKpis
          initial={{
            revenueThisMonth: data.revenueThisMonth,
            revenueToday: data.revenueToday,
            ordersToday: data.ordersToday,
            ordersThisMonth: data.ordersThisMonth,
            customerCount: data.customerCount,
            outstanding: data.outstanding,
            inventoryValue: data.inventoryValue,
            lowStock: data.lowStock,
            healthScore: data.healthScore,
          }}
        />

        {/* Charts + health */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Revenue &amp; expenses</CardTitle>
                <CardDescription>Last 6 months</CardDescription>
              </div>
              <Badge variant={revDelta >= 0 ? "success" : "danger"}>
                {revDelta >= 0 ? "▲" : "▼"} {Math.abs(revDelta).toFixed(0)}% vs last month
              </Badge>
            </CardHeader>
            <CardContent>
              <RevenueAreaChart data={data.revenueSeries} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Business health</CardTitle>
              <CardDescription>Weighted across four signals</CardDescription>
            </CardHeader>
            <CardContent>
              <HealthRing score={data.healthScore} breakdown={data.healthBreakdown} />
            </CardContent>
          </Card>
        </div>

        {/* AI insights + quick actions */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex-row items-center gap-2 space-y-0">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <CardTitle>AI insights</CardTitle>
                <CardDescription>Generated from your live data</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.insights.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing needs your attention right now.</p>
              ) : (
                data.insights.map((ins, i) => {
                  const Icon = INSIGHT_ICON[ins.tone];
                  return (
                    <div key={i} className="flex items-start gap-3 rounded-md border border-border bg-background p-3">
                      <span className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full", INSIGHT_CLS[ins.tone])}>
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <p className="text-sm leading-relaxed">{ins.text}</p>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick actions</CardTitle>
              <CardDescription>Common jobs, one tap away</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2.5">
              {QUICK_ACTIONS.map((a) => (
                <Link
                  key={a.label}
                  href={a.href}
                  className="flex flex-col gap-2 rounded-card border border-border bg-background p-3.5 transition-colors hover:border-primary/40 hover:bg-accent/50"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <a.icon className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-medium leading-tight">{a.label}</span>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Sales by category + low stock + activity */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Sales by category</CardTitle>
              <CardDescription>Revenue share</CardDescription>
            </CardHeader>
            <CardContent>
              {data.salesByCategory.length > 0 ? (
                <DonutChart data={data.salesByCategory} money height={230} />
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">No sales yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Low stock</CardTitle>
              <Link href="/inventory" className="text-xs font-medium text-primary hover:underline">
                View all
              </Link>
            </CardHeader>
            <CardContent>
              {data.lowStock.length === 0 ? (
                <EmptyState
                  icon={<Package className="h-5 w-5" />}
                  title="All stocked up"
                  description="Every product is above its reorder point."
                  className="border-0 bg-transparent py-6"
                />
              ) : (
                <ul className="space-y-2.5">
                  {data.lowStock.slice(0, 6).map((p) => (
                    <li key={p.name} className="flex items-center justify-between gap-3">
                      <span className="truncate text-sm">{p.name}</span>
                      <Badge variant="warning" className="num shrink-0">{p.stock_qty} left</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center gap-2 space-y-0">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <CardTitle>Recent activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3">
                {activity.map((a) => (
                  <li key={a.id} className="flex gap-3">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                    <div className="min-w-0">
                      <p className="truncate text-sm capitalize">{a.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{a.detail}</p>
                      <p className="text-2xs text-muted-foreground">{timeAgo(a.at)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
