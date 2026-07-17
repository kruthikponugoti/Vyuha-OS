"use client";

import * as React from "react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { switchDemoRole, signOut } from "@/lib/auth-actions";
import { supabaseBrowser } from "@/lib/supabase-browser";
import type { Role, User } from "@/lib/types";
import { ROLES } from "@/lib/types";
import { titleCase } from "@/lib/utils";
import { LogOut, Settings, UserCog, Check } from "lucide-react";
import Link from "next/link";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function UserMenu({ user, demo }: { user: User; demo: boolean }) {
  const [pending, start] = React.useTransition();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [signingOut, setSigningOut] = React.useState(false);

  async function doSignOut() {
    setSigningOut(true);
    // Full clear so the next login can never inherit this user's identity/role.
    try { await supabaseBrowser?.auth.signOut(); } catch { /* no real session */ }
    try { localStorage.clear(); sessionStorage.clear(); } catch { /* storage blocked */ }
    try { await signOut(); } catch { /* server clears cookies + Supabase session */ }
    // Hard navigation — resets the Next.js router cache and all React state.
    window.location.assign("/login");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Account menu">
          <Avatar className="h-8 w-8">
            <AvatarFallback>{initials(user.name)}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="normal-case">
          <div className="text-sm font-medium text-foreground">{user.name}</div>
          <div className="text-xs text-muted-foreground">{user.email}</div>
          <div className="mt-1 inline-flex rounded-pill bg-primary/10 px-2 py-0.5 text-2xs font-medium capitalize text-primary">
            {titleCase(user.role)}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {demo && (
          <>
            <DropdownMenuLabel className="flex items-center gap-1.5">
              <UserCog className="h-3.5 w-3.5" /> Switch role (demo)
            </DropdownMenuLabel>
            <div className="max-h-52 overflow-y-auto">
              {ROLES.map((r) => (
                <DropdownMenuItem
                  key={r}
                  disabled={pending}
                  onSelect={(e) => {
                    e.preventDefault();
                    start(async () => { await switchDemoRole(r as Role); });
                  }}
                  className="capitalize"
                >
                  <span className="flex-1">{titleCase(r)}</span>
                  {user.role === r && <Check className="h-4 w-4 text-primary" />}
                </DropdownMenuItem>
              ))}
            </div>
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings className="h-4 w-4" /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            setConfirmOpen(true);
          }}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>

      <Dialog open={confirmOpen} onOpenChange={(o) => { if (!signingOut) setConfirmOpen(o); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Sign Out</DialogTitle>
            <DialogDescription>Are you sure you want to sign out?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={signingOut}>Cancel</Button>
            <Button variant="destructive" onClick={doSignOut} disabled={signingOut}>{signingOut ? "Signing out…" : "Sign Out"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DropdownMenu>
  );
}
