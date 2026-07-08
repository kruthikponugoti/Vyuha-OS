import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { generateMonthlyReport } from "@/lib/queries/reports";
import { PageHeader } from "@/components/shell/page-header";
import { MonthlyReportView } from "@/components/documents/monthly-report-view";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Monthly Business Report" };

interface PageProps {
  searchParams: {
    year?: string;
    month?: string;
  };
}

export default async function MonthlyReportPage({ searchParams }: PageProps) {
  const session = (await getSession())!;
  const bid = session.business.id;

  // Default to current month/year
  const now = new Date();
  const year = searchParams.year ? parseInt(searchParams.year, 10) : now.getFullYear();
  const month = searchParams.month ? parseInt(searchParams.month, 10) : now.getMonth() + 1;

  const reportData = await generateMonthlyReport(bid, year, month);

  return (
    <div>
      <PageHeader 
        title="Monthly Report" 
        description={`Detailed business analysis for ${reportData.monthLabel}.`}
      >
        <Button asChild variant="outline" size="sm">
          <Link href="/documents">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Documents
          </Link>
        </Button>
      </PageHeader>
      
      <MonthlyReportView 
        report={reportData} 
        businessName={session.business.name}
        currency={session.business.currency}
      />
    </div>
  );
}
