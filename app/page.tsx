import Link from "next/link";
import { PublicNav } from "@/components/landing/public-nav";
import { HeroPreview } from "@/components/landing/hero-preview";
import {
  FeaturesSection, HowItWorksSection, IndustriesSection, TestimonialsSection,
  PricingSection, FaqSection, CtaSection, Footer,
} from "@/components/landing/sections";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 60% 50% at 50% -10%, hsl(var(--primary) / 0.12), transparent)",
          }}
        />
        <div className="mx-auto grid grid-cols-1 max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <Badge variant="primary" className="gap-1.5">
              <Sparkles className="h-3 w-3" />
              AI operating system for SMEs
            </Badge>
            <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
              Run your entire business by talking to AI
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">
              Vyuha OS replaces your CRM, ERP, inventory, HR, finance and analytics tools with one
              AI-driven platform. Type or speak a command — it does the work, against your real data.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/signup">
                  Get started free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/login">Explore the live demo</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              No credit card required · Every module included · Set up in minutes
            </p>
          </div>
          <div className="lg:pl-4">
            <HeroPreview />
          </div>
        </div>
      </section>

      {/* Logos / trust strip */}
      <div className="border-y border-border bg-secondary/20">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-6 py-6 text-sm text-muted-foreground">
          <span className="font-medium">Replaces:</span>
          {["CRM", "ERP", "Inventory", "Accounting", "HR", "Project tools", "BI dashboards"].map((t) => (
            <span key={t} className="font-display font-semibold text-ink-500 dark:text-ink-200">
              {t}
            </span>
          ))}
        </div>
      </div>

      <FeaturesSection />
      <HowItWorksSection />
      <IndustriesSection />
      <TestimonialsSection />
      <PricingSection />
      <FaqSection />
      <CtaSection />
      <Footer />
    </div>
  );
}
