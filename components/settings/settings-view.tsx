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
import { updateBusiness, addStaffMember, updateMemberRole, setMemberActive } from "@/app/(app)/settings/actions";
import { titleCase, formatDateTime } from "@/lib/utils";
import { ROLES } from "@/lib/types";
import { toast } from "sonner";
import { Plus, Copy, Check, UserPlus, UserX, UserCheck } from "lucide-react";
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
  const [staffName, setStaffName] = React.useState("");
  const [staffEmail, setStaffEmail] = React.useState("");
  const [staffRole, setStaffRole] = React.useState<Role>("sales");
  const [staffMethod, setStaffMethod] = React.useState<"temp" | "invite">("temp");
  const [creating, setCreating] = React.useState(false);
  const [cred, setCred] = React.useState<{ email: string; tempPassword?: string; invited?: boolean; demo?: boolean } | null>(null);
  const [credCopied, setCredCopied] = React.useState(false);
  const [notifPrefs, setNotifPrefs] = React.useState({ lowStock: true, overdue: true, newOrders: true, weekly: false });
  const [copied, setCopied] = React.useState(false);
  const canManage = ["owner", "admin"].includes(user.role);

  async function saveBiz() {
    setSavingBiz(true);
    const res = await updateBusiness({ name: biz.name, industry: biz.industry, country: biz.country, currency: biz.currency, timezone: biz.timezone });
    setSavingBiz(false);
    if (res.ok) { toast.success("Business settings saved."); router.refresh(); } else toast.error(res.error ?? "Save failed.");
  }
  async function createStaff() {
    if (!staffEmail.includes("@")) return toast.error("Enter a valid email.");
    setCreating(true);
    const res = await addStaffMember({ name: staffName, email: staffEmail, role: staffRole, method: staffMethod });
    setCreating(false);
    if (res.ok) {
      setCred({ email: staffEmail, tempPassword: res.tempPassword, invited: res.invited, demo: res.demo });
      toast.success(res.invited ? "Invite email sent." : "Account created.");
      setStaffName(""); setStaffEmail("");
      router.refresh();
    } else toast.error(res.error ?? "Couldn't create the account.");
  }
  async function changeRole(id: string, role: Role) {
    const res = await updateMemberRole(id, role);
    if (res.ok) { toast.success("Role updated."); router.refresh(); } else toast.error(res.error ?? "Failed.");
  }
  async function toggleActive(id: string, active: boolean) {
    const res = await setMemberActive(id, active);
    if (res.ok) { toast.success(active ? "Account reactivated." : "Account deactivated."); router.refresh(); }
    else toast.error(res.error ?? "Failed.");
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
              <div className="space-y-3 rounded-card border border-border bg-secondary/30 p-3">
                <div className="flex items-center gap-2 text-sm font-medium"><UserPlus className="h-4 w-4 text-primary" /> Add a staff member</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input value={staffName} onChange={(e) => setStaffName(e.target.value)} placeholder="Full name" />
                  <Input value={staffEmail} onChange={(e) => setStaffEmail(e.target.value)} placeholder="name@business.com" type="email" />
                  <Select value={staffRole} onValueChange={(v) => setStaffRole(v as Role)}>
                    <SelectTrigger aria-label="Role"><SelectValue /></SelectTrigger>
                    <SelectContent>{ROLES.filter((r) => r !== "owner").map((r) => <SelectItem key={r} value={r} className="capitalize">{titleCase(r)}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={staffMethod} onValueChange={(v) => setStaffMethod(v as "temp" | "invite")}>
                    <SelectTrigger aria-label="Credential method"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="temp">Temporary password</SelectItem>
                      <SelectItem value="invite">Email an invite link</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">They&apos;ll set their own password on first sign-in.</p>
                  <Button onClick={createStaff} disabled={creating}>{creating ? "Creating…" : <><Plus className="h-4 w-4" /> Create account</>}</Button>
                </div>
                {cred && (
                  <div className="rounded-md border border-success/30 bg-success-soft/60 p-3 text-sm">
                    {cred.invited ? (
                      <p>Invite link emailed to <span className="font-medium">{cred.email}</span>.{cred.demo ? " (demo — no email actually sent)" : ""}</p>
                    ) : (
                      <div className="space-y-1.5">
                        <p>Account for <span className="font-medium">{cred.email}</span> is ready. Share this temporary password — they&apos;ll change it on first login{cred.demo ? " (demo simulation)" : ""}:</p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 rounded bg-card px-2.5 py-1.5 font-mono text-sm">{cred.tempPassword}</code>
                          <Button variant="outline" size="icon-sm" aria-label="Copy password" onClick={() => { navigator.clipboard?.writeText(cred.tempPassword ?? ""); setCredCopied(true); setTimeout(() => setCredCopied(false), 1500); }}>
                            {credCopied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <Table>
              <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Member</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead>{canManage && <TableHead className="text-right">Actions</TableHead>}</TableRow></TableHeader>
              <TableBody>
                {team.map((m) => {
                  const isSelf = m.id === user.id;
                  const isOwner = m.role === "owner";
                  return (
                  <TableRow key={m.id} className={m.active === false ? "opacity-55" : undefined}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-8 w-8"><AvatarFallback>{initials(m.name)}</AvatarFallback></Avatar>
                        <div><div className="font-medium">{m.name}{isSelf && <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>}</div><div className="text-xs text-muted-foreground">{m.email}</div></div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {canManage && !isOwner && !isSelf ? (
                        <Select value={m.role} onValueChange={(v) => changeRole(m.id, v as Role)}>
                          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                          <SelectContent>{ROLES.filter((r) => r !== "owner").map((r) => <SelectItem key={r} value={r} className="capitalize">{titleCase(r)}</SelectItem>)}</SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="muted" className="capitalize">{titleCase(m.role)}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {m.active === false
                        ? <Badge variant="danger">Deactivated</Badge>
                        : m.auth_id === null
                          ? <Badge variant="warning">Pending</Badge>
                          : <Badge variant="success">Active</Badge>}
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        {!isOwner && !isSelf && (
                          m.active === false
                            ? <Button variant="outline" size="sm" onClick={() => toggleActive(m.id, true)}><UserCheck className="h-3.5 w-3.5" /> Reactivate</Button>
                            : <Button variant="outline" size="sm" onClick={() => toggleActive(m.id, false)}><UserX className="h-3.5 w-3.5" /> Deactivate</Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                  );
                })}
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
