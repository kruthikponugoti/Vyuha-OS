"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { updateBusiness, inviteMember, updateMemberRole } from "@/app/(app)/settings/actions";
import { titleCase, formatDateTime } from "@/lib/utils";
import { ROLES } from "@/lib/types";
import { toast } from "sonner";
import { Plus, Copy, Check } from "lucide-react";
import type { Business, User, AuditLog, Role } from "@/lib/types";

const INDUSTRIES = ["Retail", "Restaurants", "Healthcare", "Education", "Manufacturing", "Agencies", "Construction", "Hospitality", "Professional Services", "Wholesale"];

function initials(n: string) { return n.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase(); }

export function SettingsView({
  business, user, team, audit, demo,
}: {
  business: Business;
  user: User;
  team: User[];
  audit: AuditLog[];
  demo: boolean;
}) {
  const router = useRouter();
  const [biz, setBiz] = React.useState(business);
  const [savingBiz, setSavingBiz] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState<Role>("sales");
  const [notifPrefs, setNotifPrefs] = React.useState({ lowStock: true, overdue: true, newOrders: true, weekly: false });
  const [copied, setCopied] = React.useState(false);
  const canManage = ["owner", "admin"].includes(user.role);

  async function saveBiz() {
    setSavingBiz(true);
    const res = await updateBusiness({ name: biz.name, industry: biz.industry, country: biz.country, currency: biz.currency, timezone: biz.timezone });
    setSavingBiz(false);
    if (res.ok) { toast.success("Business settings saved."); router.refresh(); } else toast.error(res.error ?? "Save failed.");
  }
  async function invite() {
    if (!inviteEmail.includes("@")) return toast.error("Enter a valid email.");
    const res = await inviteMember(inviteEmail, inviteRole);
    if (res.ok) { toast.success(res.demo ? "Invite recorded (demo — no email sent)." : "Invite sent."); setInviteEmail(""); router.refresh(); }
    else toast.error(res.error ?? "Invite failed.");
  }
  async function changeRole(id: string, role: Role) {
    const res = await updateMemberRole(id, role);
    if (res.ok) { toast.success("Role updated."); router.refresh(); } else toast.error(res.error ?? "Failed.");
  }

  return (
    <Tabs defaultValue="business" className="p-5 sm:p-8">
     <TabsList>
        <TabsTrigger value="business">Business</TabsTrigger>
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="team">Team</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
        <TabsTrigger value="security">Security</TabsTrigger>
        <TabsTrigger value="billing">Billing</TabsTrigger>
        <TabsTrigger value="audit">Audit log</TabsTrigger>
      </TabsList>

      <TabsContent value="business">
        <Card className="max-w-2xl">
          <CardHeader><CardTitle>Business profile</CardTitle><CardDescription>How Vyuha OS formats money, dates and reports.</CardDescription></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><Label className="mb-1.5 block">Business name</Label><Input value={biz.name} onChange={(e) => setBiz({ ...biz, name: e.target.value })} disabled={!canManage} /></div>
            <div>
              <Label className="mb-1.5 block">Industry</Label>
              <Select value={biz.industry} onValueChange={(v) => setBiz({ ...biz, industry: v })} disabled={!canManage}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="mb-1.5 block">Country</Label><Input value={biz.country} onChange={(e) => setBiz({ ...biz, country: e.target.value })} disabled={!canManage} /></div>
            <div><Label className="mb-1.5 block">Currency</Label><Input value={biz.currency} onChange={(e) => setBiz({ ...biz, currency: e.target.value })} disabled={!canManage} /></div>
            <div><Label className="mb-1.5 block">Timezone</Label><Input value={biz.timezone} onChange={(e) => setBiz({ ...biz, timezone: e.target.value })} disabled={!canManage} /></div>
          </CardContent>
          {canManage && <CardFooter><Button onClick={saveBiz} disabled={savingBiz}>{savingBiz ? "Saving…" : "Save changes"}</Button></CardFooter>}
        </Card>
      </TabsContent>

      <TabsContent value="profile">
        <Card className="max-w-2xl">
          <CardHeader><CardTitle>Your profile</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16"><AvatarFallback className="text-lg">{initials(user.name)}</AvatarFallback></Avatar>
              <div>
                <div className="text-lg font-medium">{user.name}</div>
                <div className="text-sm text-muted-foreground">{user.email}</div>
                <Badge variant="primary" className="mt-1 capitalize">{titleCase(user.role)}</Badge>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div><Label className="mb-1.5 block">Full name</Label><Input defaultValue={user.name} /></div>
              <div><Label className="mb-1.5 block">Email</Label><Input defaultValue={user.email} disabled /></div>
            </div>
          </CardContent>
          <CardFooter><Button>Save profile</Button></CardFooter>
        </Card>
      </TabsContent>

      <TabsContent value="team">
        <Card>
          <CardHeader><CardTitle>Team members</CardTitle><CardDescription>{team.length} people in {business.name}.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            {canManage && (
              <div className="flex flex-col gap-2 rounded-card border border-border bg-secondary/30 p-3 sm:flex-row">
                <Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="teammate@business.com" className="flex-1" />
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as Role)}>
                  <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>{ROLES.filter((r) => r !== "owner").map((r) => <SelectItem key={r} value={r} className="capitalize">{titleCase(r)}</SelectItem>)}</SelectContent>
                </Select>
                <Button onClick={invite}><Plus className="h-4 w-4" /> Invite</Button>
              </div>
            )}
            <Table>
              <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Member</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead></TableRow></TableHeader>
              <TableBody>
                {team.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell><div className="flex items-center gap-2.5"><Avatar className="h-8 w-8"><AvatarFallback>{initials(m.name)}</AvatarFallback></Avatar><span className="font-medium">{m.name}</span></div></TableCell>
                    <TableCell className="text-muted-foreground">{m.email}</TableCell>
                    <TableCell>
                      {canManage && m.role !== "owner" ? (
                        <Select value={m.role} onValueChange={(v) => changeRole(m.id, v as Role)}>
                          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                          <SelectContent>{ROLES.filter((r) => r !== "owner").map((r) => <SelectItem key={r} value={r} className="capitalize">{titleCase(r)}</SelectItem>)}</SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="muted" className="capitalize">{titleCase(m.role)}</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="notifications">
        <Card className="max-w-2xl">
          <CardHeader><CardTitle>Notification preferences</CardTitle><CardDescription>Choose what Vyuha OS alerts you about.</CardDescription></CardHeader>
          <CardContent className="space-y-1">
            {[
              ["lowStock", "Low stock alerts", "When a product drops below its reorder point"],
              ["overdue", "Overdue invoices", "When an invoice passes its due date"],
              ["newOrders", "New orders", "When an order is recorded"],
              ["weekly", "Weekly summary", "A digest of the week's performance"],
            ].map(([key, title, desc]) => (
              <div key={key} className="flex items-center justify-between border-b border-border py-3 last:border-0">
                <div><div className="text-sm font-medium">{title}</div><div className="text-xs text-muted-foreground">{desc}</div></div>
                <Switch checked={(notifPrefs as any)[key]} onCheckedChange={(v) => { setNotifPrefs((p) => ({ ...p, [key as string]: v })); toast.success("Preference saved."); }} />
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="security">
        <div className="grid max-w-2xl gap-6">
          <Card>
            <CardHeader><CardTitle>Password</CardTitle><CardDescription>{demo ? "Password changes require Supabase Auth (add keys to enable)." : "Change your account password."}</CardDescription></CardHeader>
            <CardContent className="grid gap-4">
              <div><Label className="mb-1.5 block">Current password</Label><Input type="password" disabled={demo} placeholder="••••••••" /></div>
              <div><Label className="mb-1.5 block">New password</Label><Input type="password" disabled={demo} placeholder="••••••••" /></div>
            </CardContent>
            <CardFooter><Button disabled={demo}>Update password</Button></CardFooter>
          </Card>
          <Card>
            <CardHeader><CardTitle>API keys</CardTitle><CardDescription>Use these to integrate Vyuha OS with your own tools.</CardDescription></CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 rounded-md border border-border bg-secondary/40 p-2.5">
                <code className="flex-1 truncate font-mono text-xs">vyu_live_••••••••••••••••••••••3f9a</code>
                <Button variant="ghost" size="icon-sm" onClick={() => { navigator.clipboard?.writeText("vyu_live_demo_key"); setCopied(true); setTimeout(() => setCopied(false), 1500); toast.success("Copied."); }} aria-label="Copy API key">
                  {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="billing">
        <Card className="max-w-2xl">
          <CardHeader><CardTitle>Billing</CardTitle><CardDescription>You're on the Growth plan.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-card border border-border bg-secondary/30 p-4">
              <div><div className="font-medium">Growth</div><div className="text-sm text-muted-foreground">₹2,499 / month · renews monthly</div></div>
              <Badge variant="success">Active</Badge>
            </div>
            <p className="text-sm text-muted-foreground">No payment processor is connected in this build. Connecting Stripe or Razorpay would enable live billing here.</p>
          </CardContent>
          <CardFooter className="gap-2"><Button variant="outline">Change plan</Button><Button variant="outline">Manage payment</Button></CardFooter>
        </Card>
      </TabsContent>

      <TabsContent value="audit">
        <Card>
          <CardHeader><CardTitle>Audit log</CardTitle><CardDescription>Who did what, and when.</CardDescription></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow className="hover:bg-transparent"><TableHead>When</TableHead><TableHead>Who</TableHead><TableHead>Action</TableHead><TableHead>Detail</TableHead></TableRow></TableHeader>
              <TableBody>
                {audit.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(a.created_at)}</TableCell>
                    <TableCell className="font-medium">{a.user_name}</TableCell>
                    <TableCell><Badge variant="muted" className="capitalize">{a.action} {a.entity_type.replace(/_/g, " ")}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{a.detail}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
