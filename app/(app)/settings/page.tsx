import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { all } from "@/lib/data";
import { PageHeader } from "@/components/shell/page-header";
import { SettingsView } from "@/components/settings/settings-view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = (await getSession())!;
  // Nav hides Settings for non-admins; guard the route directly too.
  if (!["owner", "admin"].includes(session.user.role)) redirect("/dashboard");

  const bid = session.business.id;
  const [team, audit] = await Promise.all([all("users", bid), all("audit_logs", bid)]);

  return (
    <div>
      <PageHeader title="Settings" description="Business, team, security and audit." />
      <SettingsView
        business={session.business}
        user={session.user}
        team={team.sort((a, b) => a.name.localeCompare(b.name))}
        audit={audit.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 50)}
        demo={session.demo}
      />
    </div>
  );
}
