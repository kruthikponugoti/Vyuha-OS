import type { Metadata } from "next";
import { OnboardingWizard } from "@/components/auth/onboarding-wizard";
import { VyuhaWordmark } from "@/components/brand";
import { usingSupabase } from "@/lib/db";

export const metadata: Metadata = { title: "Set up your business" };

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-xl px-6 py-10">
        <VyuhaWordmark />
        <div className="mt-8">
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Set up your business
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            A few details and your workspace is ready.
            {!usingSupabase && " In demo mode this is a walkthrough — it lands you in the seeded Vyuha Home Store."}
          </p>
        </div>
        <div className="mt-6">
          <OnboardingWizard />
        </div>
      </div>
    </div>
  );
}
