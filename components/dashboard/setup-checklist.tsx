"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { loadSampleDataAction } from "@/app/(app)/actions";
import { toast } from "sonner";
import { CheckCircle2, Circle, ArrowRight, Database, Play } from "lucide-react";

export function SetupChecklist({
  customerCount,
  inventoryValue,
  invoiceCount,
  isOwnerOrAdmin,
}: {
  customerCount: number;
  inventoryValue: number;
  invoiceCount: number;
  isOwnerOrAdmin: boolean;
}) {
  const router = useRouter();
  const [loading, startLoading] = React.useTransition();

  const steps = [
    {
      title: "Add your first customer",
      desc: "Register a customer in your CRM to start tracking deals and invoices.",
      done: customerCount > 0,
      href: "/crm",
    },
    {
      title: "Add your first product",
      desc: "Populate your inventory with products, prices, and low-stock limits.",
      done: inventoryValue > 0,
      href: "/inventory",
    },
    {
      title: "Create your first invoice",
      desc: "Draft an invoice or quotation and record customer payment details.",
      done: invoiceCount > 0,
      href: "/finance/invoices?new=1",
    },
  ];

  const allDone = steps.every((s) => s.done);

  async function handleLoadSampleData() {
    startLoading(async () => {
      const res = await loadSampleDataAction();
      if (res.ok) {
        toast.success("Sample business data loaded successfully!");
        router.refresh();
      } else {
        toast.error(res.error ?? "Failed to load sample data.");
      }
    });
  }

  // Only display if the workspace is empty or partially set up.
  // Once they complete all steps, the checklist disappears.
  if (allDone) return null;

  return (
    <Card className="border-primary/20 bg-primary-soft/10">
      <CardHeader className="flex-col gap-4 sm:flex-row sm:items-start sm:justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-lg font-semibold text-primary">Get started with Vyuha OS</CardTitle>
          <CardDescription className="text-sm">
            Complete these essential steps to set up your workspace and unlock business analytics.
          </CardDescription>
        </div>
        {isOwnerOrAdmin && (
          <Button 
            onClick={handleLoadSampleData} 
            disabled={loading}
            size="sm"
            variant="outline"
            className="border-primary/30 text-primary hover:bg-primary-soft/20 w-full sm:w-auto"
          >
            <Database className="mr-2 h-4 w-4" />
            {loading ? "Loading sample data..." : "Load sample data"}
          </Button>
        )}
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-3">
        {steps.map((step, idx) => (
          <div 
            key={idx} 
            className={`flex flex-col justify-between rounded-card border bg-card p-4 transition-all ${
              step.done 
                ? "border-success-soft bg-success-soft/10 text-success-foreground opacity-80" 
                : "border-border hover:border-primary/30"
            }`}
          >
            <div>
              <div className="flex items-start gap-2.5 pb-2">
                {step.done ? (
                  <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
                )}
                <h4 className="font-semibold text-sm leading-tight">{step.title}</h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
            </div>
            
            {!step.done && (
              <Button asChild size="sm" variant="ghost" className="mt-4 px-0 w-max text-xs text-primary hover:text-primary-hover hover:bg-transparent">
                <Link href={step.href} className="flex items-center gap-1">
                  Get started <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
