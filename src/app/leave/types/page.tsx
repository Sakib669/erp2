import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser, requirePermission } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import {
  LeaveTypeManager,
  type LeaveTypeRow,
} from "@/components/leave/leave-type-manager";

export default async function LeaveTypesPage() {
  const currentUser = await getCurrentUser();
  await requirePermission("HR_VIEW");

  const cookieStore = await cookies();
  const activeBranchId = cookieStore.get("active_branch_id")?.value;

  // Fetch branches for AppShell
  const rawBranches = await prisma.branch.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, code: true, companyId: true },
    orderBy: { name: "asc" },
  });

  // Find target company
  let companyId = "";
  if (activeBranchId) {
    const activeBranch = rawBranches.find((b) => b.id === activeBranchId);
    if (activeBranch) {
      companyId = activeBranch.companyId;
    }
  }

  if (!companyId) {
    const firstCompany = await prisma.company.findFirst({
      where: { deletedAt: null },
    });
    companyId = firstCompany?.id || "";
  }

  // Fetch leave types with usage metrics
  const rawTypes = await prisma.leaveType.findMany({
    where: {
      companyId,
      deletedAt: null,
    },
    include: {
      _count: {
        select: {
          leaveBalances: true,
          leaveRequests: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const leaveTypes: LeaveTypeRow[] = rawTypes.map((t) => ({
    id: t.id,
    companyId: t.companyId,
    name: t.name,
    code: t.code,
    description: t.description,
    defaultDaysPerYear: t.defaultDaysPerYear,
    isPaid: t.isPaid,
    requiresApproval: t.requiresApproval,
    carryForwardMaxDays: t.carryForwardMaxDays,
    _count: t._count,
  }));

  const isHrAdmin =
    Boolean(
      currentUser?.roles.some((role) =>
        ["SUPER_ADMIN", "ADMIN", "HR_ADMIN"].includes(role)
      )
    ) || false;

  return (
    <AppShell
      branches={rawBranches.map((b) => ({
        id: b.id,
        name: b.name,
        code: b.code,
      }))}
      currentBranchId={activeBranchId}
      user={
        currentUser
          ? {
              name: currentUser.name,
              email: currentUser.email,
              roles: currentUser.roles,
            }
          : undefined
      }
    >
      <div className="container mx-auto max-w-7xl space-y-6 py-6">
        <LeaveTypeManager
          companyId={companyId}
          leaveTypes={leaveTypes}
          isHrAdmin={isHrAdmin}
        />
      </div>
    </AppShell>
  );
}
