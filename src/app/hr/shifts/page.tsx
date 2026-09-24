import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser, requirePermission } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import {
  ShiftManager,
  type ShiftItem,
  type BranchOption,
} from "@/components/hr/shift-manager";

export default async function ShiftsPage() {
  const currentUser = await getCurrentUser();
  await requirePermission("HR_VIEW");

  const cookieStore = await cookies();
  const activeBranchId = cookieStore.get("active_branch_id")?.value;

  const rawBranches = await prisma.branch.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });

  const branches: BranchOption[] = rawBranches.map((b) => ({
    id: b.id,
    name: b.name,
    code: b.code,
  }));

  const rawShifts = await prisma.shift.findMany({
    where: {
      deletedAt: null,
    },
    include: {
      branch: {
        select: { id: true, name: true, code: true },
      },
      _count: {
        select: {
          employees: {
            where: { deletedAt: null },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const shifts: ShiftItem[] = rawShifts.map((s) => ({
    id: s.id,
    branchId: s.branchId,
    name: s.name,
    code: s.code,
    startTime: s.startTime,
    endTime: s.endTime,
    gracePeriodMinutes: s.gracePeriodMinutes,
    branch: {
      id: s.branch.id,
      name: s.branch.name,
      code: s.branch.code,
    },
    _count: {
      employees: s._count.employees,
    },
  }));

  return (
    <AppShell
      branches={rawBranches}
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
      <div className="container mx-auto max-w-5xl space-y-6 py-6">
        <ShiftManager
          shifts={shifts}
          branches={branches}
          defaultBranchId={activeBranchId}
        />
      </div>
    </AppShell>
  );
}
