import Link from "next/link";
import {
  MessageSquare, Boxes, Receipt, Users, FolderKanban, BarChart3,
  FileText, BookOpen, ShieldCheck, Zap, Check, Store, UtensilsCrossed,
  Stethoscope, GraduationCap, Factory, Megaphone, HardHat, BedDouble,
  Briefcase, Truck,
} from "lucide-react";
import { Reveal } from "./reveal";
import { Accordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function SectionHeading({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <span className="text-sm font-semibold uppercase tracking-[0.1em] text-primary">{eyebrow}</span>
      <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
      {sub && <p className="mt-3 text-lg text-muted-foreground">{sub}</p>}
    </div>
  );
}

const FEATURES = [
  [MessageSquare, "AI Copilot", "Ask in plain language. It runs real actions across every module and shows you exactly what changed."],
  [Users, "CRM", "Customers, leads, a deal pipeline and follow-ups — with activity history on every contact."],
  [Boxes, "Inventory", "Products, suppliers, warehouses, stock movements, purchase orders and low-stock alerts."],
  [Receipt, "Finance", "Invoices, quotations, payments, expenses, tax, P&L and cash flow — with PDF export."],
  [Briefcase, "HR", "Employees, attendance, leave, payroll and per-employee documents in one place."],
  [FolderKanban, "Projects", "Kanban, calendar and timeline views with comments and attachments."],
  [BarChart3, "Analytics", "Real charts for sales, revenue, customers and inventory, plus AI recommendations."],
  [BookOpen, "Knowledge Base", "Upload your documents and let the Copilot answer from them."],
];

export function FeaturesSection() {
  return (
    <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-24">
      <SectionHeading
        eyebrow="One system"
        title="Eleven tools, replaced by one you can talk to"
        sub="Every module reads and writes the same database, and every one is reachable from the Copilot."
      />
      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(([Icon, title, desc], i) => (
          <Reveal key={title as string} delay={(i % 4) * 60}>
            <div className="group h-full rounded-card border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-raise">
              <span className="flex h-10 w-10 items-center justify-center rounded-card bg-primary/10 text-primary transition-transform group-hover:scale-105">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-display font-semibold">{title as string}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{desc as string}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

const STEPS = [
  [MessageSquare, "Ask", "“Create an invoice for ABC Company,” “show today's revenue,” “update stock.” Type or speak it."],
  [Zap, "It executes", "The Copilot calls the right action, validates against your data, and makes the change — never inventing numbers."],
  [Check, "See what changed", "Each step resolves in front of you, and every module and dashboard updates in real time."],
];

export function HowItWorksSection() {
  return (
    <section id="how" className="scroll-mt-20 border-y border-border bg-secondary/30 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading eyebrow="How it works" title="Run operations in three moves" />
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {STEPS.map(([Icon, title, desc], i) => (
            <Reveal key={title as string} delay={i * 100}>
              <div className="relative rounded-card border border-border bg-card p-6 shadow-card">
                <span className="absolute right-5 top-5 font-display text-4xl font-semibold text-muted/60">
                  {i + 1}
                </span>
                <span className="flex h-10 w-10 items-center justify-center rounded-card bg-ink-900 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-display text-lg font-semibold">{title as string}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{desc as string}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

const INDUSTRIES = [
  [Store, "Retail"], [UtensilsCrossed, "Restaurants"], [Stethoscope, "Healthcare"],
  [GraduationCap, "Education"], [Factory, "Manufacturing"], [Megaphone, "Agencies"],
  [HardHat, "Construction"], [BedDouble, "Hospitality"], [Briefcase, "Professional Services"],
  [Truck, "Wholesale"],
];

export function IndustriesSection() {
  return (
    <section id="industries" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-24">
      <SectionHeading
        eyebrow="Built for your business"
        title="One platform, many industries"
        sub="Vyuha OS adapts to how you actually work — from a single store to a growing operation."
      />
      <div className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {INDUSTRIES.map(([Icon, label], i) => (
          <Reveal key={label as string} delay={(i % 5) * 50}>
            <div className="flex flex-col items-center gap-3 rounded-card border border-border bg-card p-6 text-center shadow-card transition-colors hover:border-primary/40">
              <span className="flex h-11 w-11 items-center justify-center rounded-card bg-secondary text-ink-800 dark:text-ink-100">
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-sm font-medium">{label as string}</span>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

const TESTIMONIALS = [
  ["We closed our books in an afternoon instead of a week. I just ask for what I need.", "Meera Krishnan", "Owner, Krishnan Furnishings"],
  ["My staff record orders by talking to it. Stock and invoices stay correct without anyone chasing spreadsheets.", "Arjun Patel", "Director, Patel Wholesale"],
  ["It's the first business tool my whole team actually uses. The Copilot does the boring parts.", "Sunita Kapoor", "Founder, Horizon Interiors"],
];

export function TestimonialsSection() {
  return (
    <section className="border-y border-border bg-secondary/30 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading eyebrow="Trusted by operators" title="Less admin, more business" />
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {TESTIMONIALS.map(([quote, name, role], i) => (
            <Reveal key={name} delay={i * 80}>
              <figure className="flex h-full flex-col rounded-card border border-border bg-card p-6 shadow-card">
                <div className="flex gap-0.5 text-warning" aria-hidden>
                  {Array.from({ length: 5 }).map((_, s) => (
                    <span key={s}>★</span>
                  ))}
                </div>
                <blockquote className="mt-4 flex-1 text-sm leading-relaxed">“{quote}”</blockquote>
                <figcaption className="mt-5 border-t border-border pt-4">
                  <div className="font-medium">{name}</div>
                  <div className="text-xs text-muted-foreground">{role}</div>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

const PLANS = [
  {
    name: "Starter", price: "₹0", period: "for 14 days", desc: "Everything, to try it end to end.",
    features: ["All modules included", "1 business, up to 3 users", "AI Copilot", "Community support"],
    cta: "Start free", highlight: false,
  },
  {
    name: "Growth", price: "₹2,499", period: "per month", desc: "For a growing team running daily operations.",
    features: ["Unlimited modules", "Up to 15 users", "AI Copilot + voice", "Realtime dashboards", "PDF invoices & reports", "Priority support"],
    cta: "Get started", highlight: true,
  },
  {
    name: "Scale", price: "Custom", period: "let's talk", desc: "Multi-location, advanced roles and controls.",
    features: ["Everything in Growth", "Unlimited users", "Advanced RBAC & audit", "Knowledge Base + RAG", "Dedicated onboarding"],
    cta: "Contact sales", highlight: false,
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-24">
      <SectionHeading
        eyebrow="Pricing"
        title="Simple pricing that scales with you"
        sub="Start free. Upgrade when Vyuha OS is running your day."
      />
      <div className="mt-14 grid gap-5 md:grid-cols-3">
        {PLANS.map((plan, i) => (
          <Reveal key={plan.name} delay={i * 80}>
            <div
              className={`relative flex h-full flex-col rounded-card border bg-card p-6 shadow-card ${
                plan.highlight ? "border-primary ring-1 ring-primary" : "border-border"
              }`}
            >
              {plan.highlight && (
                <Badge variant="primary" className="absolute -top-3 left-6">
                  Most popular
                </Badge>
              )}
              <h3 className="font-display text-lg font-semibold">{plan.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{plan.desc}</p>
              <div className="mt-5 flex items-baseline gap-1.5">
                <span className="num font-display text-4xl font-semibold tracking-tight">{plan.price}</span>
                <span className="text-sm text-muted-foreground">{plan.period}</span>
              </div>
              <ul className="mt-6 flex-1 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-6 w-full" variant={plan.highlight ? "default" : "outline"}>
                <Link href="/signup">{plan.cta}</Link>
              </Button>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

const FAQS = [
  ["Do I need to know how to use accounting or ERP software?", "No. That's the point of Vyuha OS. You describe what you want in plain language — “send a payment reminder to ABC Company,” “what did we sell this month” — and the Copilot does it. The full modules are there when you want to click through them too."],
  ["Is my data really used, or is this a demo?", "It's your real data. Every number on every screen comes from a live query against your own database. The Copilot is explicitly built never to invent figures — it always runs a real action first."],
  ["Can I control what my team can see and do?", "Yes. Vyuha OS has eight roles from Owner to Viewer, enforced both in the interface and at the database level. A Viewer genuinely cannot change data; Finance can touch invoices and payments but not payroll settings, and so on."],
  ["Which industries is it for?", "Retail, restaurants, healthcare, education, manufacturing, agencies, construction, hospitality, professional services and wholesale — anywhere you manage customers, money, stock or people."],
  ["What happens to my data if I leave?", "You can export your records at any time as CSV or PDF. Your data is yours."],
  ["Do you support voice input?", "Yes. The Copilot has a microphone button that uses your browser's speech recognition, so you can run your business hands-free."],
];

export function FaqSection() {
  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-6 py-24">
      <SectionHeading eyebrow="FAQ" title="Questions, answered" />
      <div className="mt-12">
        <Accordion items={FAQS.map(([question, answer]) => ({ question, children: answer }))} />
      </div>
    </section>
  );
}

export function CtaSection() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <div className="relative overflow-hidden rounded-[24px] bg-ink-900 px-8 py-14 text-center text-white sm:px-16">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 25% 30%, #3B6FF3 0, transparent 40%), radial-gradient(circle at 75% 70%, #6390F6 0, transparent 45%)",
          }}
        />
        <div className="relative">
          <h2 className="mx-auto max-w-2xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Start running your business by talking to it
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-ink-200">
            Set up in minutes. Free for 14 days, every module included.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/signup">Get started free</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white sm:w-auto">
              <Link href="/login">See the demo</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

const FOOTER = {
  Product: [["Features", "#features"], ["How it works", "#how"], ["Pricing", "#pricing"], ["Demo", "/login"]],
  Company: [["About", "#"], ["Careers", "#"], ["Blog", "#"], ["Contact", "#"]],
  Legal: [["Privacy", "#"], ["Terms", "#"], ["Security", "#"], ["Status", "#"]],
};

export function Footer() {
  return (
    <footer className="border-t border-border bg-secondary/20">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <span className="font-display text-lg font-semibold">Vyuha OS</span>
          </span>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            The AI operating system for small and medium businesses. Run your entire business by
            talking to AI.
          </p>
        </div>
        {Object.entries(FOOTER).map(([group, links]) => (
          <div key={group}>
            <h3 className="text-sm font-semibold">{group}</h3>
            <ul className="mt-3 space-y-2">
              {links.map(([label, href]) => (
                <li key={label}>
                  <Link href={href} className="text-sm text-muted-foreground hover:text-foreground">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 py-5 text-xs text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} Vyuha OS. All rights reserved.</span>
          <span>Made for businesses that would rather be doing business.</span>
        </div>
      </div>
    </footer>
  );
}
