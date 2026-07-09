"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { demoSignIn } from "@/lib/auth-actions";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Role } from "@/lib/types";
import { ROLES } from "@/lib/types";
import { titleCase } from "@/lib/utils";
import { Sparkles } from "lucide-react";

const ROLE_HINT: Record<Role, string> = {
  owner: "Full access to everything",
  admin: "Manage the whole business",
  manager: "Operations, inventory, projects",
  finance: "Invoices, payments, expenses",
  sales: "CRM, orders, quotations",
  hr: "Employees, attendance, payroll",
  employee: "Inventory, tasks, own leave",
  viewer: "Read-only across modules",
};

export function DemoRolePicker() {
  const [role, setRole] = React.useState<Role>("owner");
  const [pending, start] = React.useTransition();
  useRouter();

  return (
    <div className="rounded-card border border-border bg-secondary/40 p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Sparkles className="h-4 w-4 text-primary" />
        Explore with sample data
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        An isolated sandbox — nothing here touches a real business. Pick a role to see exactly what
        that person can and cannot do; access is enforced, not simulated.
      </p>
      <div className="mt-3 flex gap-2">
        <Select value={role} onValueChange={(v) => setRole(v as Role)}>
          <SelectTrigger className="bg-card" aria-label="Demo role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                <span className="font-medium">{titleCase(r)}</span>
                <span className="ml-2 text-xs text-muted-foreground">{ROLE_HINT[r]}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          onClick={() => start(() => demoSignIn(role))}
          disabled={pending}
          className="shrink-0"
        >
          {pending ? "Entering…" : "Enter"}
        </Button>
      </div>
    </div>
  );
}
