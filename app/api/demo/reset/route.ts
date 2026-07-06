import { resetDemoData, usingSupabase } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST() {
  if (usingSupabase) return Response.json({ ok: false, reason: "supabase" });
  resetDemoData();
  return Response.json({ ok: true });
}
