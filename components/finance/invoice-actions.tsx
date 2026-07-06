"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { generateInvoicePdf, type InvoiceDoc } from "@/lib/invoice-pdf";
import { recordPaymentAction } from "@/app/(app)/finance/actions";
import { toast } from "sonner";
import { Download, Printer, CheckCircle2 } from "lucide-react";

export function InvoiceActions({
  doc,
  invoiceId,
  outstanding,
  canRecordPayment,
}: {
  doc: InvoiceDoc;
  invoiceId: string;
  outstanding: number;
  canRecordPayment: boolean;
}) {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);

  async function markPaid() {
    setSaving(true);
    const res = await recordPaymentAction(invoiceId);
    setSaving(false);
    if (res.ok) {
      toast.success("Payment recorded.");
      router.refresh();
    } else {
      toast.error(res.error ?? "Couldn't record payment.");
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => window.print()}>
        <Printer className="h-4 w-4" /> Print
      </Button>
      <Button variant="outline" size="sm" onClick={() => generateInvoicePdf(doc)}>
        <Download className="h-4 w-4" /> Download PDF
      </Button>
      {canRecordPayment && outstanding > 0 && doc.type === "invoice" && (
        <Button size="sm" onClick={markPaid} disabled={saving}>
          <CheckCircle2 className="h-4 w-4" /> {saving ? "Recording…" : "Mark paid"}
        </Button>
      )}
    </>
  );
}
