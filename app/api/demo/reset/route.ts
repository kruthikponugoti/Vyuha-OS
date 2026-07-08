import { resetDemoData, isDemoRequest } from "@/lib/db";

export const dynamic = "force-dynamic";

// Resets the in-memory demo store. Only works when the request is a demo
// session — refuses in real mode so it can't be used as a nuisance endpoint.
export async function POST() {
  if (!isDemoRequest()) {
    return Response.json(
      { ok: false, error: "Demo reset is only available in demo mode." },
      { status: 403 }
    );
  }
  resetDemoData();
  return Response.json({ ok: true });
}
