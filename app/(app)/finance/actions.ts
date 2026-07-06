"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { actorFromSession } from "@/lib/services";
import * as svc from "@/lib/services";

export async function recordPaymentAction(invoiceRef: string, amount?: number) {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not signed in." };
  try {
    const r = await svc.recordPayment(actorFromSession(session), { invoiceRef, amount });
    revalidatePath("/finance");
    revalidatePath(`/finance/invoices/${r.invoice.id}`);
    return { ok: true, fullyPaid: r.fullyPaid };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Failed to record payment." };
  }
}

export async function createInvoiceAction(input: {
  customer_name: string;
  items: { product_name: string; qty: number }[];
  type: "invoice" | "quotation";
}) {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not signed in." };
  try {
    const r = await svc.createInvoiceDoc(actorFromSession(session), input);
    revalidatePath("/finance");
    return { ok: true, id: r.invoice.id, number: r.invoice.number };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Failed to create invoice." };
  }
}

export async function addExpenseAction(input: {
  category: string;
  vendor?: string;
  description: string;
  amount: number;
  date: string;
}) {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not signed in." };
  const { canWrite } = await import("@/lib/auth");
  if (!canWrite(session.user.role, "expenses")) return { ok: false, error: "Your role can't add expenses." };
  const { getDb } = await import("@/lib/db");
  try {
    await getDb().from("expenses").insert({
      business_id: session.business.id,
      category: input.category,
      vendor: input.vendor ?? null,
      description: input.description,
      amount: input.amount,
      tax_amount: 0,
      date: input.date,
      created_by: session.user.id,
    });
    revalidatePath("/finance");
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Failed to add expense." };
  }
}
