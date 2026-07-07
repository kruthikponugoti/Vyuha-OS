"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { SidebarNav } from "./sidebar";
import { GlobalSearch } from "./global-search";
import { NotificationCenter } from "./notification-center";
import { UserMenu } from "./user-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import type { Business, User } from "@/lib/types";
import { cn } from "@/lib/utils";

export function AppShell({
  user,
  business,
  demo,
  children,
}: {
  user: User;
  business: Business;
  demo: boolean;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const pathname = usePathname();

  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 lg:block">
        <SidebarNav role={user.role} businessName={business.name} industry={business.industry} />
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-ink-950/40 backdrop-blur-sm transition-all duration-300"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0 w-64 shadow-overlay animate-in slide-in-from-left duration-300 ease-out bg-sidebar">
            <SidebarNav
              role={user.role}
              businessName={business.name}
              industry={business.industry}
              onNavigate={() => setMobileOpen(false)}
            />
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute right-2 top-4 text-white hover:bg-white/10 transition-colors"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </Button>
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-lg sm:px-6">
          <Button
            variant="ghost"
            size="icon-sm"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex flex-1 items-center">
            <GlobalSearch />
          </div>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <NotificationCenter />
            <div className={cn("mx-1 h-6 w-px bg-border")} />
            <UserMenu user={user} demo={demo} />
          </div>
        </header>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
