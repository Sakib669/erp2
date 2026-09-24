import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser, requirePermission } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import {
  EmployeeManager,
  type EmployeeItem,
  type BranchOption,
  type DepartmentOption,
  type DesignationOption,
  type ShiftOption,
} from "@/components/hr/employee-manager";

export default async function HRDirectoryPage() {
  const currentUser = await getCurrentUser();
  await requirePermission("HR_VIEW");

  const cookieStore = await cookies();
  const activeBranchId = cookieStore.get("active_branch_id")?.value;

  // Fetch company
  const company = await prisma.company.findFirst({
    where: { deletedAt: null },
  });

  const companyId = company?.id || "";

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

  // Fetch designations
  const rawDesignations = await prisma.designation.findMany({
    where: { deletedAt: null },
    select: { id: true, title: true, code: true },
    orderBy: { title: "asc" },
  });

  const designations: DesignationOption[] = rawDesignations.map((des) => ({
    id: des.id,
    title: des.title,
    code: des.code,
  }));

  // Fetch shifts
  const rawShifts = await prisma.shift.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      branchId: true,
      name: true,
      startTime: true,
      endTime: true,
    },
    orderBy: { name: "asc" },
  });

  const shifts: ShiftOption[] = rawShifts.map((s) => ({
    id: s.id,
    branchId: s.branchId,
    name: s.name,
    startTime: s.startTime,
    endTime: s.endTime,
  }));

  // Fetch active employees
  const rawEmployees = await prisma.employee.findMany({
    where: {
      deletedAt: null,
    },
    include: {
      branch: { select: { id: true, name: true, code: true } },
      department: { select: { id: true, name: true, code: true } },
      designation: { select: { id: true, title: true, code: true } },
      shift: {
        select: {
          id: true,
          name: true,
          startTime: true,
          endTime: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const employees: EmployeeItem[] = rawEmployees.map((e) => ({
    id: e.id,
    employeeNumber: e.employeeNumber,
    firstName: e.firstName,
    lastName: e.lastName,
    email: e.email,
    phone: e.phone,
    dateOfBirth: e.dateOfBirth ? e.dateOfBirth.toISOString() : null,
    gender: e.gender,
    joinDate: e.joinDate.toISOString(),
    confirmationDate: e.confirmationDate
      ? e.confirmationDate.toISOString()
      : null,
    status: e.status,
    employmentType: e.employmentType,
    baseSalary: e.baseSalary,
    bankName: e.bankName,
    bankAccount: e.bankAccount,
    emergencyContact: e.emergencyContact,
    branch: {
      id: e.branch.id,
      name: e.branch.name,
      code: e.branch.code,
    },
    department: {
      id: e.department.id,
      name: e.department.name,
      code: e.department.code,
    },
    designation: {
      id: e.designation.id,
      title: e.designation.title,
      code: e.designation.code,
    },
    shift: e.shift
      ? {
          id: e.shift.id,
          name: e.shift.name,
          startTime: e.shift.startTime,
          endTime: e.shift.endTime,
        }
      : null,
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
        <EmployeeManager
          employees={employees}
          branches={branches}
          departments={departments}
          designations={designations}
          shifts={shifts}
          companyId={companyId}
          currentBranchId={activeBranchId}
          currency={company?.currency || "USD"}
        />
      </div>
    </AppShell>
  );
}
