"use client";

import * as React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CrudTable } from "@/components/crud/crud-table";
import { DealPipeline } from "./deal-pipeline";
import { Badge } from "@/components/ui/badge";
import { inr } from "@/lib/utils";
import type { Customer, Lead, Deal } from "@/lib/types";
import type { ColumnDef, FieldDef } from "@/components/crud/types";

const LEAD_STATUS: Record<string, "muted" | "primary" | "success" | "warning" | "danger"> = {
  new: "primary", contacted: "warning", qualified: "success", converted: "success", lost: "danger",
};

const customerColumns: ColumnDef<Customer>[] = [
  { key: "name", header: "Name", render: (r) => (
    <div>
      <div className="font-medium">{r.name}</div>
      {r.company && <div className="text-xs text-muted-foreground">{r.company}</div>}
    </div>
  ) },
  { key: "email", header: "Contact", render: (r) => (
    <div className="text-sm">
      <div>{r.email ?? "—"}</div>
      <div className="text-xs text-muted-foreground">{r.phone ?? ""}</div>
    </div>
  ) },
  { key: "city", header: "City", render: (r) => r.city ?? "—" },
  { key: "total_spend", header: "Total spend", className: "text-right", render: (r) => <span className="num font-medium">{inr(r.total_spend)}</span> },
];

const customerFields: FieldDef[] = [
  { name: "name", label: "Name", required: true },
  { name: "company", label: "Company" },
  { name: "email", label: "Email", type: "email" },
  { name: "phone", label: "Phone", type: "tel" },
  { name: "city", label: "City" },
  { name: "address", label: "Address" },
  { name: "notes", label: "Notes", type: "textarea", full: true },
];

const leadColumns: ColumnDef<Lead>[] = [
  { key: "name", header: "Name", render: (r) => (
    <div>
      <div className="font-medium">{r.name}</div>
      {r.company && <div className="text-xs text-muted-foreground">{r.company}</div>}
    </div>
  ) },
  { key: "source", header: "Source", render: (r) => <span className="capitalize">{r.source}</span> },
  { key: "email", header: "Contact", render: (r) => <span className="text-sm">{r.email ?? r.phone ?? "—"}</span> },
  { key: "status", header: "Status", render: (r) => <Badge variant={LEAD_STATUS[r.status]} className="capitalize">{r.status}</Badge> },
];

const leadFields: FieldDef[] = [
  { name: "name", label: "Name", required: true },
  { name: "company", label: "Company" },
  { name: "email", label: "Email", type: "email" },
  { name: "phone", label: "Phone", type: "tel" },
  { name: "source", label: "Source", type: "select", options: ["walk-in", "website", "instagram", "referral", "exhibition", "other"].map((v) => ({ value: v, label: v })), defaultValue: "website" },
  { name: "status", label: "Status", type: "select", options: ["new", "contacted", "qualified", "converted", "lost"].map((v) => ({ value: v, label: v })), defaultValue: "new" },
];

export function CrmView({
  customers,
  leads,
  deals,
  canWrite,
}: {
  customers: Customer[];
  leads: Lead[];
  deals: Deal[];
  canWrite: boolean;
}) {
  const customerNames = React.useMemo(
    () => Object.fromEntries(customers.map((c) => [c.id, c.name])),
    [customers]
  );

  return (
    <Tabs defaultValue="customers" className="p-5 sm:p-8">
      <TabsList>
        <TabsTrigger value="customers">Customers ({customers.length})</TabsTrigger>
        <TabsTrigger value="leads">Leads ({leads.length})</TabsTrigger>
        <TabsTrigger value="pipeline">Pipeline ({deals.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="customers">
        <CrudTable
          table="customers"
          rows={customers}
          columns={customerColumns}
          fields={customerFields}
          searchKeys={["name", "company", "email", "phone", "city"]}
          entityName="customer"
          revalidate="/crm"
          canWrite={canWrite}
          rowHref={(r) => `/crm/customers/${r.id}`}
          exportName="customers"
          serialize={(v) => ({ ...v, tags: [], total_spend: Number(v.total_spend) || 0 })}
        />
      </TabsContent>

      <TabsContent value="leads">
        <CrudTable
          table="leads"
          rows={leads}
          columns={leadColumns}
          fields={leadFields}
          searchKeys={["name", "company", "email", "source"]}
          filters={[{ key: "status", label: "Status", options: ["new", "contacted", "qualified", "converted", "lost"].map((v) => ({ value: v, label: v })) }]}
          entityName="lead"
          revalidate="/crm"
          canWrite={canWrite}
          exportName="leads"
        />
      </TabsContent>

      <TabsContent value="pipeline">
        <DealPipeline deals={deals} customerNames={customerNames} canWrite={canWrite} />
      </TabsContent>
    </Tabs>
  );
}
