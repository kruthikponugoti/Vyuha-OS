import Link from "next/link";
import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/auth-forms";
import { usingSupabase } from "@/lib/db";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold tracking-tight">Start your workspace</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Create an account and set up your business in a couple of minutes.
      </p>

      {!usingSupabase && (
        <div className="mt-4 rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
          Demo mode: any details work and take you through onboarding. Add Supabase keys to enable
          real email/password and Google sign-up.
        </div>
      )}

      <div className="mt-6">
        <SignupForm />
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
      <p className="mt-4 text-center text-2xs text-muted-foreground">
        By continuing you agree to our Terms and acknowledge our Privacy Policy.
      </p>
    </div>
  );
}
