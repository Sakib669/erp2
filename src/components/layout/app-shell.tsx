"use client";

import * as React from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { TopNav, type UserSessionInfo } from "@/components/layout/top-nav";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { BranchOption } from "@/components/layout/branch-switcher";

interface AppShellProps {
  children: React.ReactNode;
  user?: UserSessionInfo | null;
  branches?: BranchOption[];
  currentBranchId?: string | null;
  title?: string;
  initialCollapsed?: boolean;
}

export function AppShell({
  children,
  user,
  branches = [],
  currentBranchId,
  title,
  initialCollapsed = false,
}: AppShellProps) {
  const [collapsed, setCollapsed] = React.useState(initialCollapsed);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      // Persist in cookie for server side rendering
      document.cookie = `sidebar:state=${next ? "collapsed" : "expanded"}; path=/; max-age=31536000; SameSite=Lax`;
      return next;
    });
  };

  return (
    <div className="bg-background text-foreground flex min-h-screen">
      {/* Desktop Persistent Sidebar (pure CSS md:flex to prevent SSR layout flash) */}
      <div className="hidden shrink-0 md:flex">
        <AppSidebar
          branches={branches}
          currentBranchId={currentBranchId}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapsed}
        />
      </div>

      {/* Mobile Drawer (Sheet) */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation Menu</SheetTitle>
          </SheetHeader>
          <AppSidebar
            branches={branches}
            currentBranchId={currentBranchId}
            collapsed={false}
            onLinkClick={() => setMobileOpen(false)}
            className="w-full border-r-0"
          />
        </SheetContent>
      </Sheet>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopNav
          user={user}
          title={title}
          onOpenMobileNav={() => setMobileOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
