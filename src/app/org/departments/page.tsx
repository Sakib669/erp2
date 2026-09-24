import Link from "next/link";
import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import {
  DepartmentManager,
  type DepartmentNode,
} from "@/components/org/department-manager";
import { ArrowLeft, Building2 } from "lucide-react";

export default async function DepartmentsPage() {
  const user = await getCurrentUser();
  const cookieStore = await cookies();
  const activeBranchId = cookieStore.get("active_branch_id")?.value;

  // Retrieve branches for switcher
  const branches = await prisma.branch.findMany({
    where: { deletedAt: null },
    orderBy: [{ isHeadquarters: "desc" }, { name: "asc" }],
  });

  const currentBranch =
    branches.find((b) => b.id === activeBranchId) || branches[0];

  // Retrieve all active departments for the active branch
  const departments = currentBranch
    ? await prisma.department.findMany({
        where: { branchId: currentBranch.id, deletedAt: null },
        orderBy: [{ parentId: "asc" }, { name: "asc" }],
      })
    : [];

  return (
    <AppShell
      user={user}
      branches={branches}
      currentBranchId={currentBranch?.id}
      title="Department Hierarchy"
    >
      <div className="space-y-6">
        {/* Back Link and Navigation Header */}
        <div className="border-border flex items-center justify-between border-b pb-3">
          <Button variant="ghost" size="sm" asChild className="gap-2 text-xs">
            <Link href="/org">
              <ArrowLeft className="size-4" /> Back to Facilities & Branches
            </Link>
          </Button>

          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            <Building2 className="text-primary size-3.5" />
            <span>
              Branch Context:{" "}
              <strong className="text-foreground">
                {currentBranch?.name || "None"}
              </strong>
            </span>
          </div>
        </div>

        {currentBranch ? (
          <DepartmentManager
            branchId={currentBranch.id}
            branchName={currentBranch.name}
            departments={departments as DepartmentNode[]}
          />
        ) : (
          <p className="text-muted-foreground text-xs">
            No branch context available.
          </p>
        )}
      </div>
    </AppShell>
  );
}
