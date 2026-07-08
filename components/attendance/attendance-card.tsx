"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { clockInOut, requestLeave } from "@/app/(app)/hr/actions";
import { titleCase, cn } from "@/lib/utils";
import { toast } from "sonner";
import { Clock, LogIn, LogOut, CalendarPlus } from "lucide-react";

interface MyAttendance {
  employee: string;
  today: string;
  check_in: string | null;
  check_out: string | null;
  present_this_month: number;
  absent_this_month: number;
  balance: { type: string; left: number; allowance: number }[];
}

const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "muted" | "primary"> = {
  present: "success", remote: "primary", half_day: "warning", leave: "muted", absent: "danger", "not marked": "muted",
};

export function AttendanceCard({ data }: { data: MyAttendance }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [leaveOpen, setLeaveOpen] = React.useState(false);
  const onLeave = data.today === "leave";
  // Three states: not clocked in → in; clocked in, not out → out; both done.
  const phase = onLeave ? "leave" : !data.check_in ? "in" : !data.check_out ? "out" : "done";

  function clock() {
    start(async () => {
      const res = await clockInOut();
      if (res.ok) {
        toast.success(res.state === "in" ? `Clocked in at ${res.time}${res.late ? " (late)" : ""}.` : `Clocked out at ${res.time}.`);
        router.refresh();
      } else toast.error(res.error ?? "Couldn't record that.");
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <div>
            <CardTitle>Attendance</CardTitle>
            <CardDescription>Today, {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}</CardDescription>
          </div>
        </div>
        <Badge variant={STATUS_TONE[data.today] ?? "muted"} className="capitalize">{titleCase(data.today)}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button onClick={clock} disabled={pending || phase === "leave" || phase === "done"} className="flex-1">
            {phase === "out" ? (
              <><LogOut className="h-4 w-4" /> Clock out</>
            ) : phase === "done" ? (
              <>Done for today · {data.check_in}–{data.check_out}</>
            ) : phase === "leave" ? (
              <>On leave today</>
            ) : (
              <><LogIn className="h-4 w-4" /> Clock in</>
            )}
          </Button>
          <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
            <DialogTrigger asChild>
              <Button variant="outline"><CalendarPlus className="h-4 w-4" /> Request leave</Button>
            </DialogTrigger>
            <LeaveDialog onDone={() => { setLeaveOpen(false); router.refresh(); }} />
          </Dialog>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md border border-border bg-background p-3">
            <div className="num text-2xl font-semibold text-success">{data.present_this_month}</div>
            <div className="text-xs text-muted-foreground">Present this month</div>
          </div>
          <div className="rounded-md border border-border bg-background p-3">
            <div className="num text-2xl font-semibold">{data.absent_this_month}</div>
            <div className="text-xs text-muted-foreground">Absent this month</div>
          </div>
        </div>

        <div>
          <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Leave balance</div>
          <div className="flex flex-wrap gap-2">
            {data.balance.map((b) => (
              <span key={b.type} className="rounded-pill border border-border bg-secondary px-2.5 py-1 text-xs">
                <span className="num font-medium">{b.left}</span> <span className="capitalize text-muted-foreground">{b.type}</span>
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LeaveDialog({ onDone }: { onDone: () => void }) {
  const [type, setType] = React.useState("casual");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function submit() {
    setSaving(true);
    const res = await requestLeave({ type, from_date: from, to_date: to, reason });
    setSaving(false);
    if (res.ok) { toast.success("Leave request submitted for approval."); onDone(); }
    else toast.error(res.error ?? "Couldn't submit.");
  }

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Request leave</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div>
          <Label className="mb-1.5 block">Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["casual", "sick", "earned", "unpaid"].map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="mb-1.5 block">From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><Label className="mb-1.5 block">To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        </div>
        <div><Label className="mb-1.5 block">Reason</Label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Briefly, why…" /></div>
      </div>
      <DialogFooter>
        <Button onClick={submit} disabled={saving || !from || !to}>{saving ? "Submitting…" : "Submit request"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}
