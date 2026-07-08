import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { suggestionsForRole } from "@/lib/permissions";
import { CopilotChat } from "@/components/copilot/copilot-chat";

export const metadata: Metadata = { title: "AI Copilot" };
export const dynamic = "force-dynamic";

export default async function CopilotPage() {
  const session = (await getSession())!;
  return <CopilotChat suggestions={suggestionsForRole(session.user.role)} />;
}
