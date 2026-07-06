import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { all } from "@/lib/data";
import { generateReport } from "@/lib/queries/reports";
import { PageHeader } from "@/components/shell/page-header";
import { DocumentsView } from "@/components/documents/documents-view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Documents" };

export default async function DocumentsPage() {
  const session = (await getSession())!;
  const bid = session.business.id;
  const [documents, report] = await Promise.all([all("documents", bid), generateReport(bid, "month")]);

  return (
    <div>
      <PageHeader title="Documents" description="Generate and manage business documents." />
      <DocumentsView
        documents={documents.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())}
        businessName={session.business.name}
        report={report}
      />
    </div>
  );
}
