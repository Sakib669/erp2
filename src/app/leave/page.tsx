import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser, requirePermission } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import {
  LeaveDashboard,
  type LeaveRequestItem,
  type LeaveTypeOption,
  type EmployeeOption,
  type BranchOption,
} from "@/components/leave/leave-dashboard";

export default async function LeavePage() {
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

  // Fetch leave types
  const rawLeaveTypes = await prisma.leaveType.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      code: true,
      defaultDaysPerYear: true,
      isPaid: true,
    },
    orderBy: { name: "asc" },
  });

  const leaveTypes: LeaveTypeOption[] = rawLeaveTypes.map((lt) => ({
    id: lt.id,
    name: lt.name,
    code: lt.code,
    defaultDaysPerYear: lt.defaultDaysPerYear,
    isPaid: lt.isPaid,
  }));

  // Fetch employees
  const employeeWhere: Record<string, unknown> = { deletedAt: null };
  if (activeBranchId && !currentUser?.roles.includes("SUPER_ADMIN")) {
    employeeWhere.branchId = activeBranchId;
  }

  const rawEmployees = await prisma.employee.findMany({
    where: employeeWhere,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      employeeNumber: true,
      branchId: true,
    },
    orderBy: { firstName: "asc" },
  });

  const employees: EmployeeOption[] = rawEmployees.map((e) => ({
    id: e.id,
    firstName: e.firstName,
    lastName: e.lastName,
    employeeNumber: e.employeeNumber,
    branchId: e.branchId,
  }));

  // Fetch leave requests
  const requestWhere: Record<string, unknown> = { deletedAt: null };
  if (activeBranchId && !currentUser?.roles.includes("SUPER_ADMIN")) {
    requestWhere.branchId = activeBranchId;
  }

  const rawRequests = await prisma.leaveRequest.findMany({
    where: requestWhere,
    include: {
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeNumber: true,
          department: {
            select: { id: true, name: true },
          },
        },
      },
      leaveType: {
        select: {
          id: true,
          name: true,
          code: true,
          isPaid: true,
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
    orderBy: { createdAt: "desc" },
  });

  const requests: LeaveRequestItem[] = rawRequests.map((r) => ({
    id: r.id,
    employeeId: r.employeeId,
    branchId: r.branchId,
    leaveTypeId: r.leaveTypeId,
    startDate: r.startDate.toISOString(),
    endDate: r.endDate.toISOString(),
    daysCount: r.daysCount,
    reason: r.reason,
    status: r.status,
    approvalNotes: r.approvalNotes,
    rejectionReason: r.rejectionReason,
    approvedAt: r.approvedAt ? r.approvedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
    employee: {
      id: r.employee.id,
      firstName: r.employee.firstName,
      lastName: r.employee.lastName,
      employeeNumber: r.employee.employeeNumber,
      department: {
        id: r.employee.department.id,
        name: r.employee.department.name,
      },
    },
    leaveType: {
      id: r.leaveType.id,
      name: r.leaveType.name,
      code: r.leaveType.code,
      isPaid: r.leaveType.isPaid,
    },
    branch: {
      id: r.branch.id,
      name: r.branch.name,
      code: r.branch.code,
    },
  }));

  const isHrAdmin =
    Boolean(
      currentUser?.roles.some((role) =>
        ["SUPER_ADMIN", "ADMIN", "HR_ADMIN"].includes(role)
      )
    ) || false;

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
        <LeaveDashboard
          requests={requests}
          leaveTypes={leaveTypes}
          employees={employees}
          branches={branches}
          currentBranchId={activeBranchId}
          isHrAdmin={isHrAdmin}
        />
      </div>
    </AppShell>
  );
}
