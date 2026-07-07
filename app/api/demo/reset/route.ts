import { resetDemoData } from "@/lib/db";

export const dynamic = "force-dynamic";

// Resets the in-memory demo store. Works in hybrid too — it only affects the
// demo dataset, never the real Supabase data.
export async function POST() {
  resetDemoData();
  return Response.json({ ok: true });
}
