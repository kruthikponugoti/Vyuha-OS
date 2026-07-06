"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { generateReportPdf } from "@/lib/report-pdf";
import { inr, formatDate, titleCase } from "@/lib/utils";
import { toast } from "sonner";
import { FileText, FileSpreadsheet, FileSignature, Download, Search, ScrollText } from "lucide-react";
import type { DocumentRow } from "@/lib/types";

const TYPE_ICON: Record<string, any> = {
  invoice: FileText, quotation: FileText, purchase_order: FileSpreadsheet,
  contract: FileSignature, report: ScrollText, meeting_notes: FileText, other: FileText,
};

export function DocumentsView({
  documents, businessName, report,
}: {
  documents: DocumentRow[];
  businessName: string;
  report: {
    revenue: number; expenses: number; net_profit: number; order_count: number;
    outstanding: number; new_customers: number; total_customers: number; low_stock_count: number;
  };
}) {
  const [query, setQuery] = React.useState("");
  const filtered = documents.filter((d) => d.name.toLowerCase().includes(query.toLowerCase()));

  function downloadReport() {
    generateReportPdf({
      title: "Monthly Business Report",
      businessName,
      period: "This month",
      generatedOn: formatDate(new Date()),
      metrics: [
        { label: "Revenue collected", value: inr(report.revenue) },
        { label: "Expenses", value: inr(report.expenses) },
        { label: "Net profit", value: inr(report.net_profit) },
        { label: "Orders", value: String(report.order_count) },
        { label: "Outstanding receivables", value: inr(report.outstanding) },
        { label: "New customers", value: String(report.new_customers) },
        { label: "Total customers", value: String(report.total_customers) },
        { label: "Products below reorder level", value: String(report.low_stock_count) },
      ],
    });
    toast.success("Business report downloaded.");
  }

  const GENERATORS = [
    { label: "Monthly business report", desc: "Revenue, profit, receivables and more", icon: ScrollText, action: downloadReport },
  ];

  return (
    <div className="space-y-6 p-5 sm:p-8">
      <Card>
        <CardHeader><CardTitle>Generate a document</CardTitle><CardDescription>Produce a polished PDF from your live data.</CardDescription></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {GENERATORS.map((g) => (
            <button key={g.label} onClick={g.action} className="flex items-start gap-3 rounded-card border border-border bg-background p-4 text-left transition-colors hover:border-primary/40">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary"><g.icon className="h-4.5 w-4.5" /></span>
              <div>
                <div className="flex items-center gap-1.5 text-sm font-medium">{g.label} <Download className="h-3.5 w-3.5 text-muted-foreground" /></div>
                <p className="mt-0.5 text-xs text-muted-foreground">{g.desc}</p>
              </div>
            </button>
          ))}
          <div className="rounded-card border border-dashed border-border p-4 text-sm text-muted-foreground">
            Invoices, quotations and purchase orders generate as PDF from the Finance and Inventory modules.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div><CardTitle>Document library</CardTitle><CardDescription>{documents.length} documents</CardDescription></div>
          <div className="relative max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search documents…" className="pl-8" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Created</TableHead><TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((d) => {
                const Icon = TYPE_ICON[d.type] ?? FileText;
                return (
                  <TableRow key={d.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-secondary text-muted-foreground"><Icon className="h-4 w-4" /></span>
                        <span className="font-medium">{d.name}</span>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="muted">{titleCase(d.type)}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(d.created_at)}</TableCell>
                    <TableCell><Button variant="ghost" size="icon-sm" aria-label="Download"><Download className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
