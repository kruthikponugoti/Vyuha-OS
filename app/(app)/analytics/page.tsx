import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { getAnalyticsData } from "@/lib/queries/analytics";
import { PageHeader } from "@/components/shell/page-header";
import { AnalyticsView } from "@/components/analytics/analytics-view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  const session = (await getSession())!;
  const data = await getAnalyticsData(session.business.id);
  return (
    <div>
      <PageHeader title="Analytics" description="Sales, revenue, customers and inventory — with forecasts and recommendations." />
      <AnalyticsView data={data} />
    </div>
  );
}
