import type { Metadata } from "next";
import { getSession, canWrite } from "@/lib/auth";
import { all } from "@/lib/data";
import { PageHeader } from "@/components/shell/page-header";
import { KbView } from "@/components/kb/kb-view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Knowledge Base" };

export default async function KnowledgeBasePage() {
  const session = (await getSession())!;
  const files = await all("knowledge_base_files", session.business.id);
  return (
    <div>
      <PageHeader title="Knowledge Base" description="Upload documents and let the Copilot answer from them." />
      <KbView
        files={files.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())}
        canWrite={canWrite(session.user.role, "knowledge_base_files")}
      />
    </div>
  );
}
