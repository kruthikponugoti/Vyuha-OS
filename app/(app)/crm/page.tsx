import type { Metadata } from "next";
import { getSession, canWrite } from "@/lib/auth";
import { all } from "@/lib/data";
import { PageHeader } from "@/components/shell/page-header";
import { CrmView } from "@/components/crm/crm-view";
import { RealtimeRegion } from "@/components/shell/realtime-region";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "CRM" };

export default async function CrmPage() {
  const session = (await getSession())!;
  const bid = session.business.id;
  const [customers, leads, deals] = await Promise.all([
    all("customers", bid),
    all("leads", bid),
    all("deals", bid),
  ]);

  return (
    <div>
      <PageHeader title="CRM" description="Customers, leads and your deal pipeline." />
      <RealtimeRegion tables={["customers", "leads", "deals", "activities"]}>
        <CrmView
          customers={customers.sort((a, b) => a.name.localeCompare(b.name))}
          leads={leads.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())}
          deals={deals}
          canWrite={canWrite(session.user.role, "customers")}
        />
      </RealtimeRegion>
    </div>
  );
}
