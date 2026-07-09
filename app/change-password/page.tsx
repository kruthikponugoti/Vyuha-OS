import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { KeyRound } from "lucide-react";

export const metadata: Metadata = { title: "Set your password" };
export const dynamic = "force-dynamic";

export default async function ChangePasswordPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  // Already changed → nothing to do here.
  if (!session.user.must_change_password) redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-card border border-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <KeyRound className="h-4.5 w-4.5" />
          </span>
          <div>
            <h1 className="text-lg font-semibold">Set a new password</h1>
            <p className="text-xs text-muted-foreground">Choose your own password to finish signing in.</p>
          </div>
        </div>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
