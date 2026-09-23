"use client";

import * as React from "react";
import { Menu, Search, LogOut, Shield, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

export interface UserSessionInfo {
  id?: string;
  name?: string | null;
  email?: string | null;
  roles?: string[];
}

interface TopNavProps {
  user?: UserSessionInfo | null;
  onOpenMobileNav?: () => void;
  title?: string;
}

export function TopNav({
  user,
  onOpenMobileNav,
  title = "Enterprise Operations",
}: TopNavProps) {
  const primaryRole = user?.roles?.[0] || "STAFF";

  return (
    <header className="border-border bg-background/95 sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b px-4 backdrop-blur-xs">
      <div className="flex items-center gap-3">
        {onOpenMobileNav && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenMobileNav}
            className="size-9 rounded-md md:hidden"
            aria-label="Open mobile navigation menu"
          >
            <Menu className="size-5" />
          </Button>
        )}
        <div className="flex items-center gap-2">
          <span className="text-foreground text-sm font-semibold tracking-tight">
            {title}
          </span>
          <Badge
            variant="outline"
            className="hidden text-[10px] sm:inline-flex"
          >
            Multi-Tenant
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="border-border bg-muted/40 text-muted-foreground hover:bg-muted hidden h-9 w-56 items-center justify-between rounded-md px-3 text-xs md:flex"
          onClick={() => {}}
        >
          <span className="flex items-center gap-2">
            <Search className="size-3.5" />
            <span>Search records...</span>
          </span>
          <kbd className="border-border bg-background text-muted-foreground pointer-events-none rounded border px-1.5 py-0.5 text-[10px] font-medium">
            Ctrl+K
          </kbd>
        </Button>

        <ThemeToggle />

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="hover:bg-accent flex h-9 items-center gap-2 rounded-full pr-3 pl-2"
                aria-label="User account menu"
              >
                <div className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-full text-xs font-medium">
                  {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                </div>
                <div className="hidden flex-col items-start text-left sm:flex">
                  <span className="text-xs leading-none font-medium">
                    {user.name || "Operator"}
                  </span>
                  <span className="text-muted-foreground mt-0.5 text-[10px] leading-none">
                    {primaryRole}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex flex-col gap-1 text-xs">
                <span className="font-semibold">{user.name || "Operator"}</span>
                <span className="text-muted-foreground text-[11px] font-normal">
                  {user.email || "No email assigned"}
                </span>
                <div className="mt-1 flex items-center gap-1.5">
                  <Shield className="text-primary size-3" />
                  <span className="text-primary text-[10px] font-medium">
                    Role: {primaryRole}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer text-xs">
                <Settings className="mr-2 size-3.5" />
                Account Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive cursor-pointer text-xs"
                onClick={() => {
                  window.location.href = "/api/auth/signout";
                }}
              >
                <LogOut className="mr-2 size-3.5" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            size="sm"
            className="h-8 text-xs font-medium"
            onClick={() => {
              window.location.href = "/login";
            }}
          >
            Sign In
          </Button>
        )}
      </div>
    </header>
  );
}
