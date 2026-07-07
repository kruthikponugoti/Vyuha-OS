"use client";

import * as React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TaskBoard } from "./task-board";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RecordForm } from "@/components/crud/record-form";
import { inr, formatDate, titleCase, cn } from "@/lib/utils";
import { Plus, CalendarDays } from "lucide-react";
import type { Project, Task, Customer } from "@/lib/types";
import type { FieldDef } from "@/components/crud/types";

const PROJECT_STATUS: Record<string, "muted" | "primary" | "success" | "warning"> = {
  planning: "muted", active: "primary", on_hold: "warning", completed: "success",
};

export function ProjectsView({
  projects, tasks, memberNames, customers, canWrite,
}: {
  projects: Project[];
  tasks: Task[];
  memberNames: Record<string, string>;
  customers: Customer[];
  canWrite: boolean;
}) {
  const [projectFilter, setProjectFilter] = React.useState("all");
  const [newProjectOpen, setNewProjectOpen] = React.useState(false);
  const [newTaskOpen, setNewTaskOpen] = React.useState(false);

  const projectNames = React.useMemo(() => Object.fromEntries(projects.map((p) => [p.id, p.name])), [projects]);
  const boardTasks = projectFilter === "all" ? tasks : tasks.filter((t) => t.project_id === projectFilter);

  const projectFields: FieldDef[] = [
    { name: "name", label: "Project name", required: true, full: true },
    { name: "description", label: "Description", type: "textarea", full: true },
    { name: "status", label: "Status", type: "select", options: ["planning", "active", "on_hold", "completed"].map((v) => ({ value: v, label: titleCase(v) })), defaultValue: "planning" },
    { name: "customer_id", label: "Customer", type: "select", options: customers.map((c) => ({ value: c.id, label: c.name })) },
    { name: "start_date", label: "Start date", type: "date" },
    { name: "due_date", label: "Due date", type: "date" },
    { name: "budget", label: "Budget (₹)", type: "number" },
  ];
  const taskFields: FieldDef[] = [
    { name: "title", label: "Task title", required: true, full: true },
    { name: "description", label: "Description", type: "textarea", full: true },
    { name: "project_id", label: "Project", type: "select", options: projects.map((p) => ({ value: p.id, label: p.name })), required: true },
    { name: "status", label: "Status", type: "select", options: ["todo", "in_progress", "review", "done"].map((v) => ({ value: v, label: titleCase(v) })), defaultValue: "todo" },
    { name: "priority", label: "Priority", type: "select", options: ["low", "medium", "high", "urgent"].map((v) => ({ value: v, label: titleCase(v) })), defaultValue: "medium" },
    { name: "due_date", label: "Due date", type: "date" },
  ];

  return (
    <Tabs defaultValue="board" className="p-5 sm:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <TabsList>
          <TabsTrigger value="board">Board</TabsTrigger>
          <TabsTrigger value="projects">Projects ({projects.length})</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
        </TabsList>
        {canWrite && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setNewProjectOpen(true)}><Plus className="h-4 w-4" /> Project</Button>
            <Button size="sm" onClick={() => setNewTaskOpen(true)}><Plus className="h-4 w-4" /> Task</Button>
          </div>
        )}
      </div>

      <TabsContent value="board" className="space-y-4">
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <TaskBoard tasks={boardTasks} memberNames={memberNames} projectNames={projectNames} canWrite={canWrite} />
      </TabsContent>

      <TabsContent value="projects">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => {
            const pts = tasks.filter((t) => t.project_id === p.id);
            const done = pts.filter((t) => t.status === "done").length;
            const pct = pts.length ? Math.round((done / pts.length) * 100) : 0;
            return (
              <Card key={p.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display font-semibold">{p.name}</h3>
                    <Badge variant={PROJECT_STATUS[p.status]} className="capitalize">{titleCase(p.status)}</Badge>
                  </div>
                  {p.description && <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{done}/{pts.length} tasks</span><span className="num">{pct}%</span>
                    </div>
                    <Progress value={pct} className="mt-1.5" />
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                    {p.due_date && <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {formatDate(p.due_date)}</span>}
                    {p.budget != null && <span className="num">{inr(p.budget)}</span>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </TabsContent>

      <TabsContent value="calendar">
        <TaskCalendar tasks={tasks} />
      </TabsContent>

      <RecordForm open={newProjectOpen} onOpenChange={setNewProjectOpen} table="projects" fields={projectFields} entityName="project" revalidate="/projects" serialize={(v) => ({ ...v, budget: v.budget ? Number(v.budget) : null })} />
      <RecordForm open={newTaskOpen} onOpenChange={setNewTaskOpen} table="tasks" fields={taskFields} entityName="task" revalidate="/projects" serialize={(v) => ({ ...v, order_index: 0, comments: [] })} />
    </Tabs>
  );
}

function TaskCalendar({ tasks }: { tasks: Task[] }) {
  const [cursor, setCursor] = React.useState(() => { const d = new Date(); d.setDate(1); return d; });
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = cursor.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  const byDate: Record<string, Task[]> = {};
  for (const t of tasks) {
    if (!t.due_date) continue;
    (byDate[t.due_date] ??= []).push(t);
  }

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display font-semibold">{monthLabel}</h3>
          <div className="flex gap-1">
            <Button variant="outline" size="icon-sm" onClick={() => setCursor(new Date(year, month - 1, 1))} aria-label="Previous month">‹</Button>
            <Button variant="outline" size="icon-sm" onClick={() => setCursor(new Date(year, month + 1, 1))} aria-label="Next month">›</Button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-2xs font-medium uppercase text-muted-foreground">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="py-1">{d}</div>)}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (d === null) return <div key={i} />;
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            const dayTasks = byDate[dateStr] ?? [];
            const isToday = dateStr === todayStr;
            return (
              <div key={i} className={cn("min-h-[68px] rounded-md border border-border p-1.5", isToday && "border-primary bg-primary/5")}>
                <div className={cn("text-xs num", isToday && "font-semibold text-primary")}>{d}</div>
                <div className="mt-1 space-y-0.5">
                  {dayTasks.slice(0, 2).map((t) => (
                    <div key={t.id} className={cn("truncate rounded px-1 py-0.5 text-[10px]", t.status === "done" ? "bg-success-soft text-success" : "bg-primary/10 text-primary")} title={t.title}>{t.title}</div>
                  ))}
                  {dayTasks.length > 2 && <div className="px-1 text-[10px] text-muted-foreground">+{dayTasks.length - 2} more</div>}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
