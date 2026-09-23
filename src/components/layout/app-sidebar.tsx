"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Users,
  Clock,
  CalendarCheck,
  CreditCard,
  BookOpen,
  Boxes,
  ShoppingCart,
  Workflow,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  BranchSwitcher,
  type BranchOption,
} from "@/components/layout/branch-switcher";

export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAVIGATION_GROUPS: NavGroup[] = [
  {
    label: "Main",
    items: [
      { title: "Dashboard", href: "/", icon: LayoutDashboard },
      { title: "Organization", href: "/org", icon: Building2 },
      { title: "Identity & RBAC", href: "/admin/users", icon: Users },
    ],
  },
  {
    label: "Workforce",
    items: [
      { title: "HR & Employees", href: "/hr", icon: Users },
      { title: "Attendance", href: "/attendance", icon: Clock },
      { title: "Leave Engine", href: "/leave", icon: CalendarCheck },
      { title: "Payroll", href: "/payroll", icon: CreditCard },
    ],
  },
  {
    label: "Finance & Logistics",
    items: [
      { title: "General Ledger", href: "/accounts", icon: BookOpen },
      { title: "Inventory", href: "/inventory", icon: Boxes },
      { title: "Procurement", href: "/procurement", icon: ShoppingCart },
    ],
  },
  {
    label: "Management",
    items: [
      { title: "Workflows", href: "/workflows", icon: Workflow },
      { title: "Settings & Audit", href: "/settings", icon: Settings },
    ],
  },
];

interface AppSidebarProps {
  branches: BranchOption[];
  currentBranchId?: string | null;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
  onLinkClick?: () => void;
}

export function AppSidebar({
  branches,
  currentBranchId,
  collapsed = false,
  onToggleCollapse,
  className,
  onLinkClick,
}: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "border-sidebar-border bg-sidebar text-sidebar-foreground flex h-full flex-col border-r transition-all duration-300",
          collapsed ? "w-16" : "w-64",
          className
        )}
      >
        {/* Brand Header */}
        <div className="border-sidebar-border flex h-14 items-center justify-between border-b px-3">
          <Link
            href="/"
            onClick={onLinkClick}
            className="flex items-center gap-2 overflow-hidden"
          >
            <div className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg font-bold">
              E
            </div>
            {!collapsed && (
              <div className="flex flex-col truncate">
                <span className="text-foreground truncate text-sm font-semibold tracking-tight">
                  Enterprise ERP
                </span>
                <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
                  Multi-Branch
                </span>
              </div>
            )}
          </Link>
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              className="text-muted-foreground hover:text-foreground hidden size-7 rounded-md md:flex"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <ChevronRight className="size-4" />
              ) : (
                <ChevronLeft className="size-4" />
              )}
            </Button>
          )}
        </div>

        {/* Branch Context Selector */}
        <div className="border-sidebar-border border-b p-2">
          <BranchSwitcher
            branches={branches}
            currentBranchId={currentBranchId}
            collapsed={collapsed}
          />
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 space-y-4 overflow-y-auto px-2 py-3">
          {NAVIGATION_GROUPS.map((group) => (
            <div key={group.label} className="space-y-1">
              {!collapsed && (
                <p className="text-muted-foreground px-2 pb-1 text-[10px] font-semibold tracking-wider uppercase">
                  {group.label}
                </p>
              )}
              {group.items.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);

                const linkContent = (
                  <Link
                    href={item.href}
                    onClick={onLinkClick}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      collapsed && "justify-center px-0 py-2"
                    )}
                  >
                    <item.icon className="size-4 shrink-0" />
                    {!collapsed && (
                      <span className="truncate">{item.title}</span>
                    )}
                  </Link>
                );

                if (collapsed) {
                  return (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                      <TooltipContent side="right" className="text-xs">
                        {item.title}
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return <div key={item.href}>{linkContent}</div>;
              })}
            </div>
          ))}
        </div>

        {/* Footer info */}
        {!collapsed && (
          <div className="border-sidebar-border text-muted-foreground flex items-center justify-between border-t p-3 text-[11px]">
            <span className="flex items-center gap-1.5">
              <ShieldAlert className="text-primary size-3.5" />
              <span>Branch Isolated</span>
            </span>
            <span className="font-mono text-[10px]">v1.0.0</span>
          </div>
        )}
      </aside>
    </TooltipProvider>
  );
}
