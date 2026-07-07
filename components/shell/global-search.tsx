"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Search, User, Package, Receipt, FolderKanban, FileText, ArrowRight } from "lucide-react";
import type { SearchHit } from "@/app/api/search/route";
import { cn } from "@/lib/utils";

const ICONS = {
  customer: User,
  product: Package,
  invoice: Receipt,
  project: FolderKanban,
  document: FileText,
};

const QUICK = [
  { title: "Go to Dashboard", href: "/dashboard" },
  { title: "Open AI Copilot", href: "/copilot" },
  { title: "View Invoices", href: "/finance/invoices" },
  { title: "View Inventory", href: "/inventory" },
  { title: "View Customers", href: "/crm/customers" },
];

export function GlobalSearch() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [hits, setHits] = React.useState<SearchHit[]>([]);
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  React.useEffect(() => {
    if (!query.trim()) {
      setHits([]);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: ctrl.signal });
        const data = await res.json();
        setHits(data.hits ?? []);
      } catch {
        /* aborted */
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  const go = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 w-full max-w-xs items-center gap-2 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground transition-colors hover:bg-accent"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search…</span>
        <kbd className="hidden rounded border border-border bg-muted px-1.5 font-sans text-2xs sm:inline">
          ⌘K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl gap-0 overflow-hidden p-0">
          <Command shouldFilter={false} className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-2xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-muted-foreground">
            <div className="flex items-center gap-2 border-b border-border px-4">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Command.Input
                autoFocus
                value={query}
                onValueChange={setQuery}
                placeholder="Search customers, products, invoices, projects…"
                className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <Command.List className="max-h-80 overflow-y-auto p-2">
              {loading && <div className="px-3 py-6 text-center text-sm text-muted-foreground">Searching…</div>}
              {!loading && query && hits.length === 0 && (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No results for “{query}”.
                </div>
              )}
              {!query && (
                <Command.Group heading="Quick actions">
                  {QUICK.map((item) => (
                    <Command.Item
                      key={item.href}
                      onSelect={() => go(item.href)}
                      className="flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-sm data-[selected=true]:bg-primary/10 data-[selected=true]:text-primary transition-all duration-150"
                    >
                      <ArrowRight className="h-4 w-4 shrink-0 opacity-70" />
                      {item.title}
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
              {hits.length > 0 && (
                <Command.Group heading="Results">
                  {hits.map((hit) => {
                    const Icon = ICONS[hit.type];
                    return (
                      <Command.Item
                        key={`${hit.type}-${hit.id}`}
                        value={`${hit.type}-${hit.id}`}
                        onSelect={() => go(hit.href)}
                        className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm data-[selected=true]:bg-primary/10 data-[selected=true]:text-primary transition-all duration-150"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground transition-colors group-hover:bg-primary/20">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{hit.title}</span>
                          <span className="block truncate text-xs text-muted-foreground/80 group-data-[selected=true]:text-primary/75">
                            {hit.subtitle}
                          </span>
                        </span>
                        <span className={cn("text-2xs capitalize text-muted-foreground/60")}>{hit.type}</span>
                      </Command.Item>
                    );
                  })}
                </Command.Group>
              )}
            </Command.List>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
