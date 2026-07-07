"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { StepTrace, type Step } from "./step-trace";
import { MicButton } from "./mic-button";
import { Button } from "@/components/ui/button";
import { VyuhaMark } from "@/components/brand";
import { inr, cn } from "@/lib/utils";
import { Sparkles, Send, FileText, ExternalLink, Check, X } from "lucide-react";

interface Msg {
  id: string;
  role: "user" | "ai";
  text: string;
  action?: { name: string; label: string } | null;
  trace?: Step[] | null;
  invoice_id?: string | null;
  data?: any;
  pendingConfirm?: { name: string; args: any } | null;
  sourceMessage?: string; // the user message that produced a pending confirm
  animate?: boolean;
  ok?: boolean;
}

const SUGGESTIONS = [
  "How's the business doing this month?",
  "How much stock of Oak Bookshelf is left?",
  "Record an order from Ananya Reddy — 2 Cane Lounge Chair",
  "Who hasn't paid yet?",
  "Show this month's revenue",
  "Draft a payment reminder for Sterling Hotels",
];

let idc = 0;
const nid = () => `m${++idc}`;

export function CopilotChat() {
  const [messages, setMessages] = React.useState<Msg[]>([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const listRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const router = useRouter();

  React.useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, [messages, loading]);

  async function send(text?: string, confirm = false) {
    const message = (text ?? input).trim();
    if (!message || loading) return;
    if (!confirm) {
      setMessages((p) => [...p, { id: nid(), role: "user", text: message }]);
      setInput("");
    }
    setLoading(true);

    const history = messages.filter((m) => m.text).map((m) => ({ role: m.role, text: m.text }));
    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history, confirm }),
      });
      const data = await res.json();
      setMessages((p) => [
        ...p,
        {
          id: nid(),
          role: "ai",
          text: data.reply ?? "Something went wrong.",
          action: data.action ?? null,
          trace: data.trace ?? null,
          invoice_id: data.invoice_id ?? null,
          data: data.data ?? null,
          pendingConfirm: data.pendingConfirm ?? null,
          sourceMessage: data.pendingConfirm ? message : undefined,
          animate: true,
          ok: data.ok,
        },
      ]);
      // If a dashboard/metrics change happened, the KPI pollers pick it up.
      if (data.action && !data.pendingConfirm) router.refresh();
    } catch {
      setMessages((p) => [
        ...p,
        { id: nid(), role: "ai", text: "I couldn't reach the server. Check your connection and try again.", ok: false },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function confirmAction(msg: Msg) {
    // Remove the pending prompt and re-run with confirm=true.
    setMessages((p) => p.map((m) => (m.id === msg.id ? { ...m, pendingConfirm: null } : m)));
    send(msg.sourceMessage, true);
  }

  function cancelAction(msg: Msg) {
    setMessages((p) =>
      p.map((m) =>
        m.id === msg.id ? { ...m, pendingConfirm: null, text: "No problem — I've cancelled that." } : m
      )
    );
  }

  const empty = messages.length === 0 && !loading;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
          {empty && (
            <div className="mt-10 flex flex-col items-center text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-card bg-sidebar text-primary">
                <VyuhaMark className="h-6 w-6" />
              </span>
              <h2 className="mt-5 font-display text-2xl font-semibold tracking-tight">
                What can I run for you?
              </h2>
              <p className="mt-2 max-w-md text-muted-foreground">
                Ask about your business or tell me what to do — I'll act on your real data and show
                you exactly what changed.
              </p>
              <div className="mt-8 grid grid-cols-1 w-full max-w-xl gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-card border border-border bg-card px-4 py-3 text-left text-sm text-muted-foreground shadow-card transition-colors hover:border-primary/40 hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) =>
            m.role === "user" ? (
              <div key={m.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-card rounded-tr-sm bg-ink-800 px-4 py-2.5 text-sm leading-relaxed text-white">
                  {m.text}
                </div>
              </div>
            ) : (
              <AiBubble key={m.id} msg={m} onConfirm={confirmAction} onCancel={cancelAction} />
            )
          )}

          {loading && (
            <div className="flex gap-3" aria-live="polite">
              <Avatar />
              <div className="flex items-center gap-1.5 rounded-card rounded-tl-sm border border-border bg-card px-4 py-3.5 shadow-card">
                {[0, 150, 300].map((d) => (
                  <span key={d} className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-pulseDot" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border bg-card px-4 py-3.5 sm:px-6">
        <form
          className="mx-auto flex max-w-3xl items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <MicButton onTranscript={(t) => send(t)} />
          <label htmlFor="copilot-input" className="sr-only">Message the Copilot</label>
          <input
            id="copilot-input"
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything, or tell me what to do…"
            autoComplete="off"
            className="min-w-0 flex-1 rounded-card border border-input bg-background px-4 py-2.5 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
          />
          <Button type="submit" size="icon" disabled={loading || !input.trim()} aria-label="Send">
            <Send className="h-4 w-4" />
          </Button>
        </form>
        <p className="mx-auto mt-2 max-w-3xl text-center text-2xs text-muted-foreground">
          Vyuha Copilot acts on your real data. It confirms before creating or changing anything.
        </p>
      </div>
    </div>
  );
}

function Avatar() {
  return (
    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sidebar text-primary">
      <Sparkles className="h-3.5 w-3.5" />
    </span>
  );
}

function ActionPill({ label }: { label: string }) {
  return (
    <span className="mb-1.5 inline-flex items-center gap-1.5 rounded-pill border border-border bg-secondary px-2.5 py-0.5 text-2xs font-medium uppercase tracking-[0.06em] text-muted-foreground">
      <Sparkles className="h-2.5 w-2.5 text-primary" />
      {label}
    </span>
  );
}

function AiBubble({
  msg,
  onConfirm,
  onCancel,
}: {
  msg: Msg;
  onConfirm: (m: Msg) => void;
  onCancel: (m: Msg) => void;
}) {
  const [traceDone, setTraceDone] = React.useState(!msg.trace || !msg.animate);

  return (
    <div className="flex gap-3">
      <Avatar />
      <div className="min-w-0 max-w-[88%]">
        {msg.action && <ActionPill label={msg.action.label} />}
        <div className="rounded-card rounded-tl-sm border border-border bg-card px-4 py-3 shadow-card">
          {msg.trace && <StepTrace steps={msg.trace} animate={msg.animate} onComplete={() => setTraceDone(true)} />}
          {traceDone && (
            <>
              <p className={cn("text-sm leading-relaxed", msg.trace && "mt-3 animate-stepIn", !msg.ok && "text-destructive")}>
                {msg.text}
              </p>

              {msg.data?.customers && <CustomerList rows={msg.data.customers} />}
              {msg.data?.line_items && <LineItems data={msg.data} />}
              {msg.data?.top_products && <TopProducts rows={msg.data.top_products} />}
              {msg.data?.notification_draft && <DraftNote text={msg.data.notification_draft} />}
              {msg.data?.breakdown && <HealthBars breakdown={msg.data.breakdown} />}

              {msg.invoice_id && (
                <a
                  href={`/finance/invoices/${msg.invoice_id}`}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/5 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10"
                >
                  <FileText className="h-3.5 w-3.5" />
                  View invoice
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}

              {msg.pendingConfirm && (
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => onConfirm(msg)}>
                    <Check className="h-3.5 w-3.5" /> Yes, do it
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onCancel(msg)}>
                    <X className="h-3.5 w-3.5" /> Cancel
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function LineItems({ data }: { data: any }) {
  return (
    <div className="mt-3 overflow-hidden rounded-md border border-border">
      <table className="w-full text-sm">
        <tbody>
          {data.line_items.map((l: any) => (
            <tr key={l.product_name} className="border-b border-border last:border-0">
              <td className="px-3 py-2">{l.product_name}</td>
              <td className="num px-3 py-2 text-muted-foreground">× {l.qty}</td>
              <td className="num px-3 py-2 text-right">{inr(l.subtotal)}</td>
            </tr>
          ))}
          <tr className="bg-secondary/50">
            <td className="px-3 py-2 text-2xs font-medium uppercase tracking-wide text-muted-foreground" colSpan={2}>Total</td>
            <td className="num px-3 py-2 text-right font-semibold">{inr(data.total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function CustomerList({ rows }: { rows: any[] }) {
  if (!rows.length) return null;
  return (
    <div className="mt-3 divide-y divide-border overflow-hidden rounded-md border border-border">
      {rows.map((c) => (
        <a key={c.id} href={`/crm/customers/${c.id}`} className="flex items-center justify-between px-3 py-2 text-sm hover:bg-accent/50">
          <span>
            <span className="font-medium">{c.name}</span>
            {c.company && <span className="text-muted-foreground"> · {c.company}</span>}
          </span>
          <span className="num text-xs text-muted-foreground">{inr(c.total_spend)}</span>
        </a>
      ))}
    </div>
  );
}

function TopProducts({ rows }: { rows: any[] }) {
  if (!rows.length) return null;
  return (
    <div className="mt-3 overflow-hidden rounded-md border border-border">
      <table className="w-full text-sm">
        <tbody>
          {rows.map((p) => (
            <tr key={p.name} className="border-b border-border last:border-0">
              <td className="px-3 py-2">{p.name}</td>
              <td className="num px-3 py-2 text-muted-foreground">{p.units} units</td>
              <td className="num px-3 py-2 text-right font-medium">{inr(p.revenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HealthBars({ breakdown }: { breakdown: any[] }) {
  return (
    <div className="mt-3 space-y-2">
      {breakdown.map((b) => (
        <div key={b.label}>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">{b.label}</span>
            <span className="num">{b.score}</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-muted">
            <div className={cn("h-full rounded-full", b.score >= 75 ? "bg-success" : b.score >= 50 ? "bg-warning" : "bg-destructive")} style={{ width: `${b.score}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function DraftNote({ text }: { text: string }) {
  return (
    <div className="mt-3 rounded-md border border-dashed border-border bg-secondary/40 px-3 py-2.5">
      <div className="text-2xs font-medium uppercase tracking-[0.1em] text-muted-foreground">Draft message · not sent</div>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}
