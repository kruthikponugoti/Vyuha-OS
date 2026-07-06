"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shell/empty-state";
import { timeAgo, cn } from "@/lib/utils";
import { Bell, CheckCheck, Info, TriangleAlert, CircleAlert, CircleCheck } from "lucide-react";
import type { Notification } from "@/lib/types";

const TONE = {
  info: { icon: Info, cls: "text-primary bg-primary/10" },
  success: { icon: CircleCheck, cls: "text-success bg-success-soft" },
  warning: { icon: TriangleAlert, cls: "text-warning bg-warning-soft" },
  alert: { icon: CircleAlert, cls: "text-destructive bg-destructive-soft" },
};

export function NotificationsPage({ initial }: { initial: Notification[] }) {
  const [items, setItems] = React.useState(initial);
  const router = useRouter();
  const unread = items.filter((n) => !n.read).length;

  async function markAll() {
    setItems((p) => p.map((n) => ({ ...n, read: true })));
    await fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) });
  }
  async function open(n: Notification) {
    if (!n.read) {
      setItems((p) => p.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      await fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: n.id }) });
    }
    if (n.link) router.push(n.link);
  }

  if (items.length === 0) {
    return <div className="p-5 sm:p-8"><EmptyState icon={<Bell className="h-5 w-5" />} title="No notifications" description="You're all caught up." /></div>;
  }

  return (
    <div className="p-5 sm:p-8">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{unread} unread</p>
        {unread > 0 && <Button variant="outline" size="sm" onClick={markAll}><CheckCheck className="h-4 w-4" /> Mark all read</Button>}
      </div>
      <Card className="divide-y divide-border">
        {items.map((n) => {
          const tone = TONE[n.type] ?? TONE.info;
          const Icon = tone.icon;
          return (
            <button key={n.id} onClick={() => open(n)} className={cn("flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-accent/50", !n.read && "bg-primary/[0.03]")}>
              <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full", tone.cls)}><Icon className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{n.title}</span>
                  {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
                <p className="mt-1 text-2xs text-muted-foreground">{timeAgo(n.created_at)}</p>
              </div>
            </button>
          );
        })}
      </Card>
    </div>
  );
}
