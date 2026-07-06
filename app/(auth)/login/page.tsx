import Link from "next/link";
import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/auth-forms";
import { DemoRolePicker } from "@/components/auth/demo-role-picker";
import { usingSupabase } from "@/lib/db";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Sign in to your Vyuha OS workspace.
      </p>

      {!usingSupabase && (
        <div className="mt-6">
          <DemoRolePicker />
        </div>
      )}

      <div className="mt-6">
        <LoginForm />
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to Vyuha OS?{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
