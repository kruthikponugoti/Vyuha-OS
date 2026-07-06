"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { completeOnboarding } from "@/lib/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Building2, Check, Upload, Users, X, Plus, ArrowRight, ArrowLeft } from "lucide-react";
import type { Role } from "@/lib/types";

const INDUSTRIES = [
  "Retail", "Restaurants", "Healthcare", "Education", "Manufacturing",
  "Agencies", "Construction", "Hospitality", "Professional Services", "Wholesale",
];
const COUNTRIES = [
  ["India", "INR", "Asia/Kolkata"],
  ["United States", "USD", "America/New_York"],
  ["United Kingdom", "GBP", "Europe/London"],
  ["United Arab Emirates", "AED", "Asia/Dubai"],
  ["Singapore", "SGD", "Asia/Singapore"],
  ["Australia", "AUD", "Australia/Sydney"],
] as const;

const STEPS = ["Business", "Region", "Team"];

function StepDots({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-colors",
              i < step
                ? "bg-success text-success-foreground"
                : i === step
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
            )}
          >
            {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
          </div>
          <span className={cn("text-sm", i === step ? "font-medium" : "text-muted-foreground")}>
            {label}
          </span>
          {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-border" />}
        </div>
      ))}
    </div>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Setting up…" : "Finish setup"}
      <ArrowRight className="h-4 w-4" />
    </Button>
  );
}

export function OnboardingWizard() {
  const [step, setStep] = React.useState(0);
  const [state, action] = useFormState(completeOnboarding, undefined);

  const [industry, setIndustry] = React.useState("Retail");
  const [countryIdx, setCountryIdx] = React.useState(0);
  const [logo, setLogo] = React.useState<string | null>(null);
  const [invites, setInvites] = React.useState<{ email: string; role: Role }[]>([]);
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState<Role>("sales");

  const [country, currency, timezone] = COUNTRIES[countryIdx];

  function onLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogo(reader.result as string);
    reader.readAsDataURL(file);
  }

  function addInvite() {
    const email = inviteEmail.trim();
    if (!email || !email.includes("@")) return;
    setInvites((p) => [...p, { email, role: inviteRole }]);
    setInviteEmail("");
  }

  return (
    <form action={action} className="rounded-card border border-border bg-card p-6 shadow-card sm:p-8">
      {/* hidden fields carry wizard state into the server action */}
      <input type="hidden" name="industry" value={industry} />
      <input type="hidden" name="country" value={country} />
      <input type="hidden" name="currency" value={currency} />
      <input type="hidden" name="timezone" value={timezone} />

      <StepDots step={step} />

      {state?.error && (
        <p className="mt-4 rounded-md bg-destructive-soft px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="mt-6 min-h-[280px]">
        {/* Step 1 — Business */}
        <div className={cn(step === 0 ? "block animate-fadeUp" : "hidden")}>
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Building2 className="h-4 w-4" /> Tell us about your business
          </div>
          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="business_name">Business name</Label>
              <Input id="business_name" name="business_name" placeholder="Vyuha Home Store" required defaultValue="" />
            </div>
            <div className="space-y-1.5">
              <Label>Industry</Label>
              <Select value={industry} onValueChange={setIndustry}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((i) => (
                    <SelectItem key={i} value={i}>{i}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Logo (optional)</Label>
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-card border border-border bg-muted">
                  {logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logo} alt="Logo preview" className="h-full w-full object-cover" />
                  ) : (
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-card px-3 py-2 text-sm font-medium hover:bg-accent">
                  <Upload className="h-4 w-4" />
                  Upload
                  <input type="file" accept="image/*" className="sr-only" onChange={onLogo} />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Step 2 — Region */}
        <div className={cn(step === 1 ? "block animate-fadeUp" : "hidden")}>
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            Region &amp; currency
          </div>
          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label>Country</Label>
              <Select value={String(countryIdx)} onValueChange={(v) => setCountryIdx(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map(([c], i) => (
                    <SelectItem key={c} value={String(i)}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-md border border-border bg-background p-3">
                <div className="text-2xs uppercase tracking-wide text-muted-foreground">Currency</div>
                <div className="mt-1 font-medium">{currency}</div>
              </div>
              <div className="rounded-md border border-border bg-background p-3">
                <div className="text-2xs uppercase tracking-wide text-muted-foreground">Timezone</div>
                <div className="mt-1 font-medium">{timezone}</div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              These set your default formatting for money, dates and reports. You can change them
              later in Settings.
            </p>
          </div>
        </div>

        {/* Step 3 — Team */}
        <div className={cn(step === 2 ? "block animate-fadeUp" : "hidden")}>
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Users className="h-4 w-4" /> Invite your team (optional)
          </div>
          <div className="mt-4 space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="teammate@business.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addInvite();
                  }
                }}
              />
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as Role)}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["admin", "manager", "finance", "sales", "hr", "employee", "viewer"] as Role[]).map((r) => (
                    <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" size="icon" onClick={addInvite} aria-label="Add invite">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {invites.length === 0 ? (
                <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
                  No invites yet. You can always add teammates later.
                </p>
              ) : (
                invites.map((inv, i) => (
                  <div key={i} className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2">
                    <span className="text-sm">{inv.email}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="muted" className="capitalize">{inv.role}</Badge>
                      <button
                        type="button"
                        onClick={() => setInvites((p) => p.filter((_, j) => j !== i))}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label={`Remove ${inv.email}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-border pt-5">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button type="button" onClick={() => setStep((s) => s + 1)}>
            Continue
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Submit />
        )}
      </div>
    </form>
  );
}
