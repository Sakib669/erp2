import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser, requirePermission } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import {
  DeviceManager,
  type RawAttendanceLogItem,
  type BranchOption,
} from "@/components/attendance/device-manager";

export default async function AttendanceDevicesPage() {
  const currentUser = await getCurrentUser();
  await requirePermission("HR_VIEW");

  const cookieStore = await cookies();
  const activeBranchId = cookieStore.get("active_branch_id")?.value;

  // Fetch branches
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

  // Fetch recent raw attendance logs
  const rawLogs = await prisma.rawAttendanceLog.findMany({
    include: {
      branch: {
        select: { id: true, name: true, code: true },
      },
    },
    orderBy: { punchTime: "desc" },
    take: 100,
  });

  const logs: RawAttendanceLogItem[] = rawLogs.map((l) => ({
    id: l.id,
    branchId: l.branchId,
    deviceId: l.deviceId,
    employeeNumber: l.employeeNumber,
    punchTime: l.punchTime,
    punchType: l.punchType,
    processed: l.processed,
    processingError: l.processingError,
    createdAt: l.createdAt,
    branch: l.branch,
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
      <div className="container mx-auto max-w-7xl space-y-6 py-6">
        <DeviceManager
          logs={logs}
          branches={branches}
          currentBranchId={activeBranchId}
        />
      </div>
    </AppShell>
  );
}
