import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { all } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ notifications: [], unread: 0 }, { status: 401 });
  const rows = await all("notifications", session.business.id);
  const notifications = rows.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  return Response.json({
    notifications,
    unread: notifications.filter((n) => !n.read).length,
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ ok: false }, { status: 401 });
  const { id, all: markAll } = await req.json();
  const db = getDb();
  if (markAll) {
    const rows = await all("notifications", session.business.id);
    for (const n of rows.filter((r) => !r.read)) {
      await db.from("notifications").update({ read: true }).eq("id", n.id);
    }
  } else if (id) {
    await db.from("notifications").update({ read: true }).eq("id", id);
  }
  return Response.json({ ok: true });
}
