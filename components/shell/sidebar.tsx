"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { VyuhaMark } from "@/components/brand";
import { NavIcon } from "./icon";
import { visibleNav } from "@/lib/nav";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SidebarNav({
  role,
  businessName,
  industry,
  onNavigate,
}: {
  role: Role;
  businessName: string;
  industry: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const groups = visibleNav(role, industry);

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2.5 px-5 pb-6 pt-6">
        <VyuhaMark className="h-6 w-6 text-primary" />
        <div>
          <div className="font-display text-base font-semibold leading-none tracking-tight">
            Vyuha OS
          </div>
          <div className="mt-1 text-2xs uppercase tracking-[0.14em] text-sidebar-muted">
            Business Copilot
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4" aria-label="Main">
        {groups.map((group) => (
          <div key={group.label}>
            <div className="px-3 pb-1.5 text-2xs font-medium uppercase tracking-[0.12em] text-sidebar-muted">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-sidebar-active text-white"
                        : "text-sidebar-foreground/75 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <NavIcon name={item.icon} className="h-[18px] w-[18px]" />
                    <span>{item.label}</span>
                    {active && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border px-5 py-4">
        <div className="text-2xs font-medium uppercase tracking-[0.12em] text-sidebar-muted">
          Workspace
        </div>
        <div className="mt-1 truncate text-sm font-medium">{businessName}</div>
        <div className="mt-0.5 text-xs text-sidebar-muted">{industry}</div>
      </div>
    </div>
  );
}
