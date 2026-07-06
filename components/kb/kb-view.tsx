"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shell/empty-state";
import { addKnowledgeFile, askKnowledge } from "@/app/(app)/knowledge-base/actions";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { FileText, Search, Upload, Sparkles, BookOpen } from "lucide-react";
import type { KnowledgeBaseFile } from "@/lib/types";

export function KbView({ files, canWrite }: { files: KnowledgeBaseFile[]; canWrite: boolean }) {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [answer, setAnswer] = React.useState<{ answer: string | null; sources?: string[] } | null>(null);
  const [asking, setAsking] = React.useState(false);
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [text, setText] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setAsking(true);
    const res = await askKnowledge(q);
    setAsking(false);
    if (res.ok) setAnswer({ answer: res.answer ?? null, sources: res.sources });
    else toast.error("Search failed.");
  }

  async function upload() {
    setSaving(true);
    const res = await addKnowledgeFile({ name, text });
    setSaving(false);
    if (res.ok) {
      toast.success("Document added to the knowledge base.");
      setUploadOpen(false); setName(""); setText("");
      router.refresh();
    } else toast.error(res.error ?? "Upload failed.");
  }

  return (
    <div className="space-y-6 p-5 sm:p-8">
      <Card>
        <CardHeader className="flex-row items-center gap-2 space-y-0">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary"><Sparkles className="h-4 w-4" /></span>
          <div><CardTitle>Ask your documents</CardTitle><CardDescription>The Copilot answers from your uploaded knowledge base.</CardDescription></div>
        </CardHeader>
        <CardContent>
          <form onSubmit={ask} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. What is our return policy?" className="pl-8" />
            </div>
            <Button type="submit" disabled={asking || !q.trim()}>{asking ? "Searching…" : "Ask"}</Button>
          </form>
          {answer && (
            <div className="mt-4 rounded-card border border-border bg-background p-4">
              {answer.answer ? (
                <>
                  <p className="text-sm leading-relaxed">{answer.answer}</p>
                  {answer.sources && <p className="mt-2 text-xs text-muted-foreground">Sources: {answer.sources.join(", ")}</p>}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">I couldn&apos;t find anything about that in your documents.</p>
              )}
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {["What is our return policy?", "How long is the furniture warranty?", "What are the store hours?", "What are the payment terms for suppliers?"].map((s) => (
              <button key={s} onClick={() => setQ(s)} className="rounded-pill border border-border bg-secondary px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground">{s}</button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div><CardTitle>Knowledge base</CardTitle><CardDescription>{files.length} documents · used by the Copilot to answer questions</CardDescription></div>
          {canWrite && (
            <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
              <DialogTrigger asChild><Button size="sm"><Upload className="h-4 w-4" /> Add document</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add a document</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="kb-name" className="mb-1.5 block">Document name</Label>
                    <Input id="kb-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Delivery Policy.pdf" />
                  </div>
                  <div>
                    <Label htmlFor="kb-text" className="mb-1.5 block">Content</Label>
                    <Textarea id="kb-text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste the document text…" className="min-h-[140px]" />
                    <p className="mt-1 text-xs text-muted-foreground">In demo mode, paste text directly. With Supabase Storage connected, you&apos;d upload a PDF/DOCX and text is extracted automatically.</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
                  <Button onClick={upload} disabled={saving || !name.trim() || !text.trim()}>{saving ? "Adding…" : "Add document"}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <EmptyState icon={<BookOpen className="h-5 w-5" />} title="No documents yet" description="Add policies, handbooks and guides so the Copilot can answer from them." className="border-0" />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {files.map((f) => (
                <div key={f.id} className="flex items-start gap-3 rounded-card border border-border bg-background p-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground"><FileText className="h-4.5 w-4.5" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{f.name}</span>
                      <Badge variant={f.status === "ready" ? "success" : "warning"} className="shrink-0 capitalize">{f.status}</Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{f.extracted_text}</p>
                    <p className="mt-1.5 text-2xs text-muted-foreground">{(f.size_bytes / 1024).toFixed(0)} KB · {formatDate(f.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
