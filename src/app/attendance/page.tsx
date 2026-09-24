import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser, requirePermission } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import {
  AttendanceDashboard,
  type AttendanceRecordItem,
  type BranchOption,
  type DepartmentOption,
} from "@/components/attendance/attendance-dashboard";

interface AttendancePageProps {
  searchParams: Promise<{
    date?: string;
    branchId?: string;
  }>;
}

export default async function AttendancePage({
  searchParams,
}: AttendancePageProps) {
  const params = await searchParams;
  const currentUser = await getCurrentUser();
  await requirePermission("HR_VIEW");

  const cookieStore = await cookies();
  const activeBranchId = cookieStore.get("active_branch_id")?.value;

  const targetDate = params.date || new Date().toISOString().split("T")[0];
  const targetBranchId = params.branchId || activeBranchId;

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

  // Fetch departments
  const rawDepartments = await prisma.department.findMany({
    where: { deletedAt: null },
    select: { id: true, branchId: true, name: true, code: true },
    orderBy: { name: "asc" },
  });

  const departments: DepartmentOption[] = rawDepartments.map((d) => ({
    id: d.id,
    branchId: d.branchId,
    name: d.name,
    code: d.code,
  }));

  // Fetch attendance records for target date
  const startOfDay = new Date(`${targetDate}T00:00:00.000Z`);

  const whereClause: Record<string, unknown> = {
    date: startOfDay,
    deletedAt: null,
  };

  if (targetBranchId && targetBranchId !== "ALL") {
    whereClause.branchId = targetBranchId;
  }

  const rawRecords = await prisma.attendanceRecord.findMany({
    where: whereClause,
    include: {
      employee: {
        select: {
          id: true,
          employeeNumber: true,
          firstName: true,
          lastName: true,
          email: true,
          department: { select: { id: true, name: true } },
          designation: { select: { id: true, title: true } },
        },
      },
      shift: {
        select: {
          id: true,
          name: true,
          startTime: true,
          endTime: true,
        },
      },
      branch: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
    orderBy: { employee: { firstName: "asc" } },
  });

  const records: AttendanceRecordItem[] = rawRecords.map((r) => ({
    id: r.id,
    employeeId: r.employeeId,
    branchId: r.branchId,
    date: r.date.toISOString(),
    checkIn: r.checkIn ? r.checkIn.toISOString() : null,
    checkOut: r.checkOut ? r.checkOut.toISOString() : null,
    totalWorkMinutes: r.totalWorkMinutes,
    overtimeMinutes: r.overtimeMinutes,
    lateMinutes: r.lateMinutes,
    earlyExitMinutes: r.earlyExitMinutes,
    status: r.status,
    isManualCorrection: r.isManualCorrection,
    correctionReason: r.correctionReason,
    employee: r.employee,
    shift: r.shift,
    branch: r.branch,
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
        <AttendanceDashboard
          records={records}
          branches={branches}
          departments={departments}
          currentBranchId={targetBranchId}
          currentDate={targetDate}
        />
      </div>
    </AppShell>
  );
}
