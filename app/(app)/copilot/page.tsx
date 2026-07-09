import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { suggestionsForRole } from "@/lib/permissions";
import { industryConfig } from "@/lib/industry";
import { CopilotChat } from "@/components/copilot/copilot-chat";

export const metadata: Metadata = { title: "AI Copilot" };
export const dynamic = "force-dynamic";

export default async function CopilotPage() {
  const session = (await getSession())!;
  const role = session.user.role;
  const roleSuggestions = suggestionsForRole(role);
  // Owner/Admin see everything, so we can safely lead with industry-flavoured
  // prompts; narrower roles keep their role-scoped suggestions (refined per role
  // in the Copilot workstream).
  const ind = industryConfig(session.business.industry);
  const suggestions = ["owner", "admin"].includes(role)
    ? [...new Set([...ind.prompts, ...roleSuggestions])].slice(0, 6)
    : roleSuggestions;
  return <CopilotChat suggestions={suggestions} />;
}
