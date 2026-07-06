import Link from "next/link";
import type { Metadata } from "next";
import { VyuhaWordmark } from "@/components/brand";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Verify your email" };

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <VyuhaWordmark />
      <div className="mt-10 flex h-14 w-14 items-center justify-center rounded-card bg-primary/10 text-primary">
        <MailCheck className="h-7 w-7" />
      </div>
      <h1 className="mt-6 font-display text-2xl font-semibold tracking-tight">Check your inbox</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        We&apos;ve sent a verification link to your email. Click it to confirm your account, then
        come back to finish setting up your business.
      </p>
      <Button asChild variant="outline" className="mt-6">
        <Link href="/login">Back to sign in</Link>
      </Button>
    </div>
  );
}
