"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { moveTask, addComment, addAttachment } from "@/app/(app)/projects/actions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, timeAgo, cn } from "@/lib/utils";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, MessageSquare, Calendar, Send, Paperclip, Download, FileText } from "lucide-react";
import type { Task, TaskStatus } from "@/lib/types";

function fmtSize(b: number) { return b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`; }

const COLUMNS: { key: TaskStatus; label: string; tone: string }[] = [
  { key: "todo", label: "To do", tone: "bg-ink-300" },
  { key: "in_progress", label: "In progress", tone: "bg-primary" },
  { key: "review", label: "Review", tone: "bg-warning" },
  { key: "done", label: "Done", tone: "bg-success" },
];

const PRIORITY: Record<string, "muted" | "warning" | "danger" | "primary"> = {
  low: "muted", medium: "primary", high: "warning", urgent: "danger",
};

function initials(n: string) { return n.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase(); }

export function TaskBoard({
  tasks, memberNames, projectNames, canWrite,
}: {
  tasks: Task[];
  memberNames: Record<string, string>;
  projectNames?: Record<string, string>;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [active, setActive] = React.useState<Task | null>(null);
  const [comment, setComment] = React.useState("");
  const [posting, setPosting] = React.useState(false);
  const [attaching, setAttaching] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  async function onAttach(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !active) return;
    setAttaching(true);
    try {
      // Inline small files as data URLs so they're downloadable in demo mode.
      const data_url = f.size <= 512 * 1024 ? await new Promise<string | null>((res) => {
        const r = new FileReader();
        r.onload = () => res(typeof r.result === "string" ? r.result : null);
        r.onerror = () => res(null);
        r.readAsDataURL(f);
      }) : null;
      const result = await addAttachment(active.id, { name: f.name, size: f.size, type: f.type, data_url });
      if (result.ok) {
        toast.success(`Attached ${f.name}.`);
        setActive(null);
        router.refresh();
      } else toast.error(result.error ?? "Couldn't attach that.");
    } finally {
      setAttaching(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function move(t: Task, dir: -1 | 1) {
    const idx = COLUMNS.findIndex((c) => c.key === t.status);
    const next = COLUMNS[idx + dir];
    if (!next) return;
    const res = await moveTask(t.id, next.key);
    if (res.ok) router.refresh();
    else toast.error(res.error ?? "Couldn't move task.");
  }

  async function submitComment() {
    if (!active || !comment.trim()) return;
    setPosting(true);
    const res = await addComment(active.id, comment);
    setPosting(false);
    if (res.ok) {
      toast.success("Comment added.");
      setComment("");
      setActive(null);
      router.refresh();
    } else toast.error(res.error ?? "Failed.");
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => {
          const items = tasks.filter((t) => t.status === col.key).sort((a, b) => a.order_index - b.order_index);
          return (
            <div key={col.key} className="rounded-card border border-border bg-secondary/30 p-2.5">
              <div className="mb-2.5 flex items-center gap-2 px-1">
                <span className={cn("h-2 w-2 rounded-full", col.tone)} />
                <span className="text-sm font-medium">{col.label}</span>
                <span className="text-xs text-muted-foreground">{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.map((t) => {
                  const idx = COLUMNS.findIndex((c) => c.key === t.status);
                  return (
                    <Card key={t.id} className="p-3 shadow-none">
                      <button className="w-full text-left" onClick={() => setActive(t)}>
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium leading-tight">{t.title}</p>
                          <Badge variant={PRIORITY[t.priority]} className="shrink-0 capitalize">{t.priority}</Badge>
                        </div>
                        {projectNames?.[t.project_id] && <p className="mt-1 truncate text-2xs text-muted-foreground">{projectNames[t.project_id]}</p>}
                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-2xs text-muted-foreground">
                            {t.due_date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(t.due_date)}</span>}
                            {t.comments?.length > 0 && <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{t.comments.length}</span>}
                            {t.attachments?.length > 0 && <span className="flex items-center gap-1"><Paperclip className="h-3 w-3" />{t.attachments.length}</span>}
                          </div>
                          {t.assignee_id && memberNames[t.assignee_id] && (
                            <Avatar className="h-5 w-5"><AvatarFallback className="text-[9px]">{initials(memberNames[t.assignee_id])}</AvatarFallback></Avatar>
                          )}
                        </div>
                      </button>
                      {canWrite && (
                        <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                          <Button variant="ghost" size="icon-sm" disabled={idx === 0} onClick={() => move(t, -1)} aria-label="Move back"><ChevronLeft className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon-sm" disabled={idx === COLUMNS.length - 1} onClick={() => move(t, 1)} aria-label="Move forward"><ChevronRight className="h-3.5 w-3.5" /></Button>
                        </div>
                      )}
                    </Card>
                  );
                })}
                {items.length === 0 && <p className="px-1 py-3 text-center text-xs text-muted-foreground">No tasks</p>}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="sm:max-w-lg">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle>{active.title}</DialogTitle>
              </DialogHeader>
              <div className="flex flex-wrap gap-2">
                <Badge variant={PRIORITY[active.priority]} className="capitalize">{active.priority}</Badge>
                <Badge variant="muted" className="capitalize">{active.status.replace("_", " ")}</Badge>
                {active.due_date && <Badge variant="outline"><Calendar className="h-3 w-3" /> {formatDate(active.due_date)}</Badge>}
              </div>
              {active.description && <p className="text-sm text-muted-foreground">{active.description}</p>}

              <div className="space-y-3">
                <h4 className="text-sm font-medium">Comments</h4>
                {active.comments?.length ? (
                  <div className="space-y-3">
                    {active.comments.map((c, i) => (
                      <div key={i} className="flex gap-2.5">
                        <Avatar className="h-7 w-7"><AvatarFallback className="text-[10px]">{initials(c.user_name)}</AvatarFallback></Avatar>
                        <div className="min-w-0 flex-1 rounded-md bg-secondary/50 px-3 py-2">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-xs font-medium">{c.user_name}</span>
                            <span className="text-2xs text-muted-foreground">{timeAgo(c.created_at)}</span>
                          </div>
                          <p className="mt-0.5 text-sm">{c.body}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No comments yet.</p>
                )}
                {canWrite && (
                  <div className="flex gap-2">
                    <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment…" className="min-h-[40px]" />
                    <Button size="icon" onClick={submitComment} disabled={posting || !comment.trim()} aria-label="Post comment"><Send className="h-4 w-4" /></Button>
                  </div>
                )}
              </div>

              <div className="space-y-3 border-t border-border pt-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Attachments</h4>
                  {canWrite && (
                    <>
                      <input ref={fileRef} type="file" className="sr-only" onChange={onAttach} />
                      <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={attaching}>
                        <Paperclip className="h-3.5 w-3.5" /> {attaching ? "Attaching…" : "Attach file"}
                      </Button>
                    </>
                  )}
                </div>
                {active.attachments?.length ? (
                  <ul className="space-y-1.5">
                    {active.attachments.map((a, i) => (
                      <li key={i} className="flex items-center gap-2.5 rounded-md border border-border bg-background px-3 py-2">
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{a.name}</p>
                          <p className="text-2xs text-muted-foreground">{fmtSize(a.size)} · {a.uploaded_by} · {timeAgo(a.created_at)}</p>
                        </div>
                        {a.data_url ? (
                          <a href={a.data_url} download={a.name} className="shrink-0 text-muted-foreground hover:text-foreground" aria-label={`Download ${a.name}`}><Download className="h-4 w-4" /></a>
                        ) : (
                          <span className="shrink-0 text-2xs text-muted-foreground">stored</span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No attachments yet.</p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
