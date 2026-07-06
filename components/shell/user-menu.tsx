"use client";

import * as React from "react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { switchDemoRole, signOut } from "@/lib/auth-actions";
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
                    start(() => switchDemoRole(r as Role));
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
            start(() => signOut());
          }}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
