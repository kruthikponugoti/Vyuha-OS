import { dataVersion, realMode } from "@/lib/db";

export const dynamic = "force-dynamic";

// Lightweight change signal for the client realtime hook. In real mode the
// client subscribes to Supabase Realtime instead; in demo mode it polls this
// monotonic counter (shared across tabs in the same server process) and
// refreshes when it moves.
export async function GET() {
  return Response.json({ version: dataVersion(), realtime: realMode() });
}
