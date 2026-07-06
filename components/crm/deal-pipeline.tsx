"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { saveRecord } from "@/app/(app)/actions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RecordForm } from "@/components/crud/record-form";
import { inr, cn } from "@/lib/utils";
import { toast } from "sonner";
import { Plus, ChevronLeft, ChevronRight, GripVertical } from "lucide-react";
import type { Deal, DealStage } from "@/lib/types";

const STAGES: { key: DealStage; label: string; tone: string }[] = [
  { key: "qualified", label: "Qualified", tone: "bg-ink-400" },
  { key: "proposal", label: "Proposal", tone: "bg-primary" },
  { key: "negotiation", label: "Negotiation", tone: "bg-warning" },
  { key: "won", label: "Won", tone: "bg-success" },
  { key: "lost", label: "Lost", tone: "bg-destructive" },
];

const FIELDS = [
  { name: "title", label: "Deal title", required: true, full: true },
  { name: "value", label: "Value (₹)", type: "number" as const, required: true },
  { name: "stage", label: "Stage", type: "select" as const, options: STAGES.map((s) => ({ value: s.key, label: s.label })), defaultValue: "qualified" },
  { name: "expected_close", label: "Expected close", type: "date" as const },
];

export function DealPipeline({
  deals,
  customerNames,
  canWrite,
}: {
  deals: Deal[];
  customerNames: Record<string, string>;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  async function move(deal: Deal, dir: -1 | 1) {
    const idx = STAGES.findIndex((s) => s.key === deal.stage);
    const next = STAGES[idx + dir];
    if (!next) return;
    const res = await saveRecord("deals", { id: deal.id, stage: next.key }, "/crm");
    if (res.ok) {
      toast.success(`Moved to ${next.label}.`);
      router.refresh();
    } else {
      toast.error(res.error ?? "Couldn't move deal.");
    }
  }

  const totalOpen = deals.filter((d) => d.stage !== "won" && d.stage !== "lost").reduce((s, d) => s + d.value, 0);
  const won = deals.filter((d) => d.stage === "won").reduce((s, d) => s + d.value, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-4 text-sm">
          <span className="text-muted-foreground">Open pipeline: <span className="num font-semibold text-foreground">{inr(totalOpen)}</span></span>
          <span className="text-muted-foreground">Won: <span className="num font-semibold text-success">{inr(won)}</span></span>
        </div>
        {canWrite && (
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> New deal
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {STAGES.map((stage) => {
          const items = deals.filter((d) => d.stage === stage.key);
          const total = items.reduce((s, d) => s + d.value, 0);
          return (
            <div key={stage.key} className="rounded-card border border-border bg-secondary/30 p-2.5">
              <div className="mb-2.5 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className={cn("h-2 w-2 rounded-full", stage.tone)} />
                  <span className="text-sm font-medium">{stage.label}</span>
                  <span className="text-xs text-muted-foreground">{items.length}</span>
                </div>
              </div>
              <div className="mb-2 px-1 text-2xs text-muted-foreground num">{inr(total)}</div>
              <div className="space-y-2">
                {items.map((deal) => {
                  const idx = STAGES.findIndex((s) => s.key === deal.stage);
                  return (
                    <Card key={deal.id} className="p-3 shadow-none">
                      <div className="flex items-start gap-1.5">
                        <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-tight">{deal.title}</p>
                          {deal.customer_id && customerNames[deal.customer_id] && (
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">{customerNames[deal.customer_id]}</p>
                          )}
                          <p className="num mt-1.5 text-sm font-semibold">{inr(deal.value)}</p>
                        </div>
                      </div>
                      {canWrite && (
                        <div className="mt-2 flex items-center justify-between">
                          <Button variant="ghost" size="icon-sm" disabled={idx === 0} onClick={() => move(deal, -1)} aria-label="Move back">
                            <ChevronLeft className="h-3.5 w-3.5" />
                          </Button>
                          <Badge variant="muted" className="text-2xs">{STAGES[idx].label}</Badge>
                          <Button variant="ghost" size="icon-sm" disabled={idx === STAGES.length - 1} onClick={() => move(deal, 1)} aria-label="Move forward">
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </Card>
                  );
                })}
                {items.length === 0 && (
                  <p className="px-1 py-3 text-center text-xs text-muted-foreground">No deals</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <RecordForm
        open={open}
        onOpenChange={setOpen}
        table="deals"
        fields={FIELDS}
        entityName="deal"
        revalidate="/crm"
        serialize={(v) => ({ ...v, value: Number(v.value) || 0 })}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}
