import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSession } from "@/lib/auth";
import { AppShell } from "@/components/shell/app-shell";
import { moduleForPath, canAccessModule } from "@/lib/permissions";

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  // Route protection: if the role can't access the module for this path, bounce
  // to the dashboard with a message (the pathname is set by middleware).
  const pathname = headers().get("x-pathname") ?? "";
  const module = moduleForPath(pathname);
  if (module && !canAccessModule(session.user.role, module)) {
    redirect(`/dashboard?denied=${module}`);
  }

  return (
    <AppShell user={session.user} business={session.business} demo={session.demo}>
      {children}
    </AppShell>
  );
}
