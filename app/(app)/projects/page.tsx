import type { Metadata } from "next";
import { getSession, canWrite } from "@/lib/auth";
import { all } from "@/lib/data";
import { PageHeader } from "@/components/shell/page-header";
import { ProjectsView } from "@/components/projects/projects-view";
import { RealtimeRegion } from "@/components/shell/realtime-region";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const session = (await getSession())!;
  const bid = session.business.id;
  const [projects, tasks, users, customers] = await Promise.all([
    all("projects", bid),
    all("tasks", bid),
    all("users", bid),
    all("customers", bid),
  ]);
  const memberNames = Object.fromEntries(users.map((u) => [u.id, u.name]));

  return (
    <div>
      <PageHeader title="Projects" description="Projects, tasks, board and calendar." />
      <RealtimeRegion tables={["projects", "tasks"]}>
        <ProjectsView
          projects={projects.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())}
          tasks={tasks}
          memberNames={memberNames}
          customers={customers.sort((a, b) => a.name.localeCompare(b.name))}
          canWrite={canWrite(session.user.role, "tasks")}
        />
      </RealtimeRegion>
    </div>
  );
}
