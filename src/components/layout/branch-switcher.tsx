"use client";

import * as React from "react";
import { Building2, Check, ChevronsUpDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { setActiveBranchAction } from "@/actions/branch-actions";

export interface BranchOption {
  id: string;
  name: string;
  code: string;
  isHeadquarters?: boolean;
}

interface BranchSwitcherProps {
  branches: BranchOption[];
  currentBranchId?: string | null;
  collapsed?: boolean;
}

export function BranchSwitcher({
  branches,
  currentBranchId,
  collapsed = false,
}: BranchSwitcherProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  const activeBranch =
    branches.find((b) => b.id === currentBranchId) || branches[0];

  const handleSelectBranch = (branch: BranchOption) => {
    if (branch.id === activeBranch?.id) return;

    startTransition(async () => {
      const res = await setActiveBranchAction(branch.id);
      if (res.success) {
        toast.success(`Switched active branch to ${branch.name}`);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to switch branch");
      }
    });
  };

  if (!branches || branches.length === 0) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 px-3 py-2 text-xs">
        <Building2 className="size-4 shrink-0" />
        {!collapsed && <span>No branch assigned</span>}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size={collapsed ? "icon" : "default"}
          className={
            collapsed
              ? "border-border bg-sidebar/50 size-9 rounded-md"
              : "border-border bg-sidebar/50 flex h-9 w-full items-center justify-between gap-2 rounded-md px-3 text-left font-normal"
          }
          aria-label="Switch active branch"
          disabled={isPending}
        >
          <div className="flex items-center gap-2 truncate">
            <Building2 className="text-primary size-4 shrink-0" />
            {!collapsed && (
              <div className="flex flex-col truncate text-xs">
                <span className="truncate leading-none font-medium">
                  {activeBranch ? activeBranch.name : "Select Branch"}
                </span>
                <span className="text-muted-foreground text-[10px]">
                  {activeBranch?.code || "Branch Context"}
                </span>
              </div>
            )}
          </div>
          {!collapsed && (
            <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-xs">
          Assigned Branches
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {branches.map((branch) => {
          const isSelected = branch.id === activeBranch?.id;
          return (
            <DropdownMenuItem
              key={branch.id}
              onClick={() => handleSelectBranch(branch)}
              className="flex cursor-pointer items-center justify-between text-xs"
            >
              <div className="flex flex-col">
                <span className="font-medium">{branch.name}</span>
                <span className="text-muted-foreground text-[10px]">
                  Code: {branch.code}
                  {branch.isHeadquarters ? " · HQ" : ""}
                </span>
              </div>
              {isSelected && <Check className="text-primary size-4" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
