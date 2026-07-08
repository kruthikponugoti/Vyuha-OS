import Link from "next/link";
import { Suspense } from "react";
import { getSession, canWrite } from "@/lib/auth";
import { getDashboardData, getRecentActivity, getMyTasks } from "@/lib/queries/dashboard";
import { myAttendance } from "@/lib/queries/copilot-data";
import { canSeeWidget, canAccessModule } from "@/lib/permissions";
import { AttendanceCard } from "@/components/attendance/attendance-card";
import { PageHeader } from "@/components/shell/page-header";
import { LiveKpis, type KpiKey } from "@/components/dashboard/live-kpis";
import { HealthRing } from "@/components/dashboard/health-ring";
import { DeniedToast } from "@/components/dashboard/denied-toast";
import { RevenueAreaChart, DonutChart } from "@/components/charts/charts";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shell/empty-state";
import { inr, timeAgo, formatDate, titleCase, cn } from "@/lib/utils";
import {
  Sparkles, Lightbulb, TriangleAlert, TrendingUp, Package,
  FileText, UserPlus, Boxes, Activity, ListChecks, CheckCircle2,
} from "lucide-react";

export const dynamic = "force-dynamic";

const INSIGHT_ICON = { good: TrendingUp, watch: Lightbulb, alert: TriangleAlert };
const INSIGHT_CLS = {
  good: "text-success bg-success-soft",
  watch: "text-warning bg-warning-soft",
  alert: "text-destructive bg-destructive-soft",
};

// Quick actions carry the module + table they touch, so we show only the ones a
// role can actually reach and perform.
const QUICK_ACTIONS = [
  { label: "Ask the Copilot", href: "/copilot", icon: Sparkles, module: "copilot" as const },
  { label: "New invoice", href: "/finance/invoices?new=1", icon: FileText, module: "finance" as const, table: "invoices" },
  { label: "Add customer", href: "/crm/customers?new=1", icon: UserPlus, module: "crm" as const, table: "customers" },
  { label: "Update stock", href: "/inventory?new=1", icon: Boxes, module: "inventory" as const, table: "products" },
];

const TASK_STATUS: Record<string, "muted" | "primary" | "warning" | "success"> = {
  todo: "muted", in_progress: "primary", review: "warning", done: "success",
};

export default async function DashboardPage() {
  const session = (await getSession())!;
  const role = session.user.role;
  const show = (w: Parameters<typeof canSeeWidget>[1]) => canSeeWidget(role, w);

  // Self-service attendance for staff who clock in (not owner/admin, whose
  // dashboards stay unchanged). Only shows if their account links to an employee.
  const isStaff = ["manager", "finance", "sales", "hr", "employee"].includes(role);
  const [data, activity, myTasks, myAtt] = await Promise.all([
    getDashboardData(session.business.id),
    show("activity") ? getRecentActivity(session.business.id) : Promise.resolve([]),
    show("my_tasks") ? getMyTasks(session.business.id, session.user.id) : Promise.resolve([]),
    isStaff ? myAttendance(session.business.id, session.user.id) : Promise.resolve({ linked: false as const }),
  ]);

  const revDelta =
    data.revenuePrevMonth > 0
      ? ((data.revenueThisMonth - data.revenuePrevMonth) / data.revenuePrevMonth) * 100
      : 0;

  const kpis: KpiKey[] = [
    show("kpi_revenue") && "revenue",
    show("kpi_orders") && "orders",
    show("kpi_customers") && "customers",
    show("kpi_outstanding") && "outstanding",
  ].filter(Boolean) as KpiKey[];

  const actions = QUICK_ACTIONS.filter(
    (a) => canAccessModule(role, a.module) && (!("table" in a) || canWrite(role, a.table as string))
  );

  const showChartsRow = show("revenue_chart") || show("health");
  const showInsightsRow = show("insights") || (show("quick_actions") && actions.length > 0);
  const showBottomRow = show("sales_by_category") || show("low_stock") || show("activity") || show("my_tasks");

  return (
    <div>
      <Suspense fallback={null}>
        <DeniedToast />
      </Suspense>

      <PageHeader
        title={`Good day, ${session.user.name.split(" ")[0]}`}
        description="Here's how your business is doing today."
      >
        {canAccessModule(role, "analytics") && (
          <Button asChild variant="outline" size="sm">
            <Link href="/analytics">View analytics</Link>
          </Button>
        )}
        {canAccessModule(role, "copilot") && (
          <Button asChild size="sm">
            <Link href="/copilot">
              <Sparkles className="h-4 w-4" /> Ask the Copilot
            </Link>
          </Button>
        )}
      </PageHeader>

      <div className="space-y-6 p-5 sm:p-8">
        {kpis.length > 0 && (
          <LiveKpis
            visible={kpis}
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
        )}

        {/* Self-service attendance for staff linked to an employee record */}
        {myAtt.linked && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <AttendanceCard
                data={{
                  employee: myAtt.employee,
                  today: myAtt.today,
                  check_in: myAtt.check_in,
                  check_out: myAtt.check_out,
                  present_this_month: myAtt.present_this_month,
                  absent_this_month: myAtt.absent_this_month,
                  balance: myAtt.balance,
                }}
              />
            </div>
          </div>
        )}

        {/* Charts + health */}
        {showChartsRow && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {show("revenue_chart") && (
              <Card className={show("health") ? "lg:col-span-2" : "lg:col-span-3"}>
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
            )}

            {show("health") && (
              <Card>
                <CardHeader>
                  <CardTitle>Business health</CardTitle>
                  <CardDescription>Weighted across four signals</CardDescription>
                </CardHeader>
                <CardContent>
                  <HealthRing score={data.healthScore} breakdown={data.healthBreakdown} />
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* AI insights + quick actions */}
        {showInsightsRow && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {show("insights") && (
              <Card className={show("quick_actions") && actions.length > 0 ? "lg:col-span-2" : "lg:col-span-3"}>
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
            )}

            {show("quick_actions") && actions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Quick actions</CardTitle>
                  <CardDescription>Common jobs, one tap away</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-2.5">
                  {actions.map((a) => (
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
            )}
          </div>
        )}

        {/* Sales by category + my tasks + low stock + activity */}
        {showBottomRow && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {show("sales_by_category") && (
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
            )}

            {show("my_tasks") && (
              <Card className="lg:col-span-2">
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <div className="flex items-center gap-2">
                    <ListChecks className="h-4 w-4 text-muted-foreground" />
                    <CardTitle>My tasks</CardTitle>
                  </div>
                  <Link href="/projects" className="text-xs font-medium text-primary hover:underline">
                    Open Projects
                  </Link>
                </CardHeader>
                <CardContent>
                  {myTasks.length === 0 ? (
                    <EmptyState
                      icon={<CheckCircle2 className="h-5 w-5" />}
                      title="Nothing assigned"
                      description="You have no open tasks right now."
                      className="border-0 bg-transparent py-6"
                    />
                  ) : (
                    <ul className="divide-y divide-border">
                      {myTasks.map((t) => (
                        <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{t.title}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {t.project}
                              {t.due_date ? ` · due ${formatDate(t.due_date)}` : ""}
                            </p>
                          </div>
                          <Badge variant={TASK_STATUS[t.status]} className="shrink-0 capitalize">
                            {titleCase(t.status)}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            )}

            {show("low_stock") && (
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
            )}

            {show("activity") && (
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
            )}
          </div>
        )}
      </div>
    </div>
  );
}
