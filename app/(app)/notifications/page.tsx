import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { all } from "@/lib/data";
import { PageHeader } from "@/components/shell/page-header";
import { NotificationsPage } from "@/components/notifications/notifications-page";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Notifications" };

export default async function Notifications() {
  const session = (await getSession())!;
  const items = await all("notifications", session.business.id);
  return (
    <div>
      <PageHeader title="Notifications" description="Everything that needs your attention." />
      <NotificationsPage initial={items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())} />
    </div>
  );
}
