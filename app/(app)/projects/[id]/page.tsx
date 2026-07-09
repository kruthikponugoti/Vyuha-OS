import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession, canWrite } from "@/lib/auth";
import { all, byId } from "@/lib/data";
import { PageHeader } from "@/components/shell/page-header";
import { StatCard } from "@/components/shell/stat-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TaskBoard } from "@/components/projects/task-board";
import { inr, formatDate } from "@/lib/utils";
import { ArrowLeft, Building2, CalendarRange, Wallet } from "lucide-react";
import type { Task, Customer, User as AppUser } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, "success" | "warning" | "muted" | "primary"> = {
  active: "success", planning: "primary", on_hold: "warning", completed: "muted",
};

export default async function ProjectDetail({ params }: { params: { id: string } }) {
  const session = (await getSession())!;
  const bid = session.business.id;
  const project = await byId("projects", bid, params.id);
  if (!project) notFound();

  const [tasks, users, customers] = await Promise.all([
    all("tasks", bid),
    all("users", bid),
    all("customers", bid),
  ]);

  const projectTasks = (tasks as Task[]).filter((t) => t.project_id === project.id);
  const done = projectTasks.filter((t) => t.status === "done").length;
  const pct = projectTasks.length ? Math.round((done / projectTasks.length) * 100) : 0;
  const customer = (customers as Customer[]).find((c) => c.id === project.customer_id);
  const memberNames = Object.fromEntries((users as AppUser[]).map((u) => [u.id, u.name]));
  const canWriteTasks = canWrite(session.user.role, "tasks");

  return (
    <div>
      <PageHeader title={project.name} description={project.description ?? "Project"}>
        <Button asChild variant="outline" size="sm">
          <Link href="/projects"><ArrowLeft className="h-4 w-4" /> Back to projects</Link>
        </Button>
      </PageHeader>

      <div className="space-y-6 p-5 sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={STATUS_TONE[project.status]} className="capitalize">{project.status.replace("_", " ")}</Badge>
          {customer && <span className="flex items-center gap-1.5 text-sm text-muted-foreground"><Building2 className="h-3.5 w-3.5" /> {customer.name}</span>}
          {(project.start_date || project.due_date) && (
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <CalendarRange className="h-3.5 w-3.5" /> {project.start_date ? formatDate(project.start_date) : "—"} – {project.due_date ? formatDate(project.due_date) : "—"}
            </span>
          )}
          {project.budget != null && <span className="flex items-center gap-1.5 text-sm text-muted-foreground"><Wallet className="h-3.5 w-3.5" /> {inr(project.budget)}</span>}
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Progress" value={`${pct}%`} sub={`${done}/${projectTasks.length} tasks done`} tone={pct === 100 ? "success" : "default"} />
          <StatCard label="To do" value={projectTasks.filter((t) => t.status === "todo").length} />
          <StatCard label="In progress" value={projectTasks.filter((t) => t.status === "in_progress").length} />
          <StatCard label="In review" value={projectTasks.filter((t) => t.status === "review").length} />
        </div>

        <Card>
          <CardHeader><CardTitle>Board</CardTitle></CardHeader>
          <CardContent>
            {projectTasks.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">No tasks in this project yet.</p>
            ) : (
              <TaskBoard tasks={projectTasks} memberNames={memberNames} canWrite={canWriteTasks} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
