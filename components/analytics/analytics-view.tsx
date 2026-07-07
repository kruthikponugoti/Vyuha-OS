"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { StatCard } from "@/components/shell/stat-card";
import { RevenueAreaChart, SimpleBarChart, DonutChart, TrendLineChart } from "@/components/charts/charts";
import { inr, cn } from "@/lib/utils";
import { Lightbulb, TrendingUp, TriangleAlert, Sparkles } from "lucide-react";
import type { AnalyticsData } from "@/lib/queries/analytics";

const REC_ICON = { good: TrendingUp, watch: Lightbulb, alert: TriangleAlert };
const REC_CLS = {
  good: "text-success bg-success-soft", watch: "text-warning bg-warning-soft", alert: "text-destructive bg-destructive-soft",
};

export function AnalyticsView({ data }: { data: AnalyticsData }) {
  return (
    <div className="p-5 sm:p-8">
      <Tabs defaultValue="sales">
       <TabsList>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="inventory">Products</TabsTrigger>
          <TabsTrigger value="forecast">Forecast</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Avg order value" value={inr(data.aov)} />
            <StatCard label="Repeat rate" value={`${data.repeatRate}%`} sub="customers with 2+ orders" />
            <StatCard label="Top category" value={data.salesByCategory[0]?.name ?? "—"} sub={data.salesByCategory[0] ? inr(data.salesByCategory[0].value) : ""} />
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Orders per month</CardTitle><CardDescription>Last 6 months</CardDescription></CardHeader>
              <CardContent><SimpleBarChart data={data.ordersSeries} dataKey="orders" labelKey="month" color={1} /></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Sales by category</CardTitle><CardDescription>Revenue share</CardDescription></CardHeader>
              <CardContent><DonutChart data={data.salesByCategory} money /></CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Revenue trend</CardTitle><CardDescription>Payments received, last 6 months</CardDescription></CardHeader>
            <CardContent><RevenueAreaChart data={data.revenueSeries} keys={[{ key: "revenue", label: "Revenue" }]} height={300} /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Top customers</CardTitle><CardDescription>By total spend</CardDescription></CardHeader>
              <CardContent><SimpleBarChart data={data.topCustomers} dataKey="value" labelKey="name" money color={0} /></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Customers by city</CardTitle><CardDescription>Distribution</CardDescription></CardHeader>
              <CardContent><DonutChart data={data.customersByCity} /></CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Top products</CardTitle><CardDescription>By revenue</CardDescription></CardHeader>
            <CardContent><SimpleBarChart data={data.topProducts} dataKey="revenue" labelKey="name" money color={2} height={300} /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forecast" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Revenue forecast</CardTitle><CardDescription>Next 2 months projected from recent trend (dashed region)</CardDescription></CardHeader>
            <CardContent><TrendLineChart data={data.forecast} dataKey="revenue" labelKey="month" money height={300} /></CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* AI recommendations — always visible under the charts */}
      <Card className="mt-6">
        <CardHeader className="flex-row items-center gap-2 space-y-0">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary"><Sparkles className="h-4 w-4" /></span>
          <div><CardTitle>AI recommendations</CardTitle><CardDescription>Actions suggested from your data</CardDescription></div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {data.recommendations.map((r, i) => {
            const Icon = REC_ICON[r.tone];
            return (
              <div key={i} className="flex items-start gap-3 rounded-md border border-border bg-background p-3.5">
                <span className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full", REC_CLS[r.tone])}><Icon className="h-4 w-4" /></span>
                <div>
                  <p className="text-sm font-medium">{r.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{r.text}</p>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
