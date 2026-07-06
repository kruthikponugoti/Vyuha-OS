import Link from "next/link";
import { VyuhaWordmark } from "@/components/brand";
import { Check } from "lucide-react";

const POINTS = [
  "One AI copilot across CRM, inventory, finance, HR and projects",
  "Every number pulled live from your own data — never invented",
  "Invoices, payments and stock updated by asking, in plain language",
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <div className="flex flex-1 flex-col px-6 py-8 sm:px-10 lg:px-16">
        <Link href="/" className="inline-flex">
          <VyuhaWordmark />
        </Link>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Vyuha OS. Built for small and medium businesses.
        </p>
      </div>

      {/* Brand panel */}
      <div className="relative hidden w-[46%] overflow-hidden bg-ink-900 lg:block">
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #3B6FF3 0, transparent 40%), radial-gradient(circle at 80% 70%, #6390F6 0, transparent 45%)",
          }}
          aria-hidden
        />
        <div className="relative flex h-full flex-col justify-center px-14 text-white">
          <h2 className="font-display text-3xl font-semibold leading-tight tracking-tight">
            Run your entire business by talking to AI.
          </h2>
          <p className="mt-4 max-w-md text-ink-200">
            Vyuha OS replaces a stack of disconnected tools with one operating system your whole
            team runs by asking.
          </p>
          <ul className="mt-8 space-y-3">
            {POINTS.map((p) => (
              <li key={p} className="flex items-start gap-3 text-ink-100">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/25 text-primary">
                  <Check className="h-3 w-3" />
                </span>
                <span className="text-sm">{p}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
