import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser, requirePermission } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import {
  EmployeeDetail,
  type EmployeeDetailData,
  type BranchOption,
  type DepartmentOption,
  type DesignationOption,
} from "@/components/hr/employee-detail";

interface EmployeeProfilePageProps {
  params: Promise<{ id: string }>;
}

export default async function EmployeeProfilePage({
  params,
}: EmployeeProfilePageProps) {
  const { id } = await params;
  const currentUser = await getCurrentUser();
  await requirePermission("HR_VIEW");

  const cookieStore = await cookies();
  const activeBranchId = cookieStore.get("active_branch_id")?.value;

  // Fetch employee record
  const employee = await prisma.employee.findFirst({
    where: {
      id,
      deletedAt: null,
    },
    include: {
      company: { select: { id: true, name: true, currency: true } },
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
      user: { select: { id: true, name: true, email: true } },
      transitions: {
        orderBy: { effectiveDate: "desc" },
      },
    },
  });

  if (!employee) {
    notFound();
  }

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

  const employeeData: EmployeeDetailData = {
    id: employee.id,
    userId: employee.userId,
    employeeNumber: employee.employeeNumber,
    firstName: employee.firstName,
    lastName: employee.lastName,
    email: employee.email,
    phone: employee.phone,
    dateOfBirth: employee.dateOfBirth,
    gender: employee.gender,
    joinDate: employee.joinDate,
    confirmationDate: employee.confirmationDate,
    status: employee.status,
    employmentType: employee.employmentType,
    baseSalary: employee.baseSalary,
    bankName: employee.bankName,
    bankAccount: employee.bankAccount,
    emergencyContact: employee.emergencyContact,
    createdAt: employee.createdAt,
    company: employee.company,
    branch: employee.branch,
    department: employee.department,
    designation: employee.designation,
    shift: employee.shift,
    user: employee.user,
    transitions: employee.transitions.map((t) => ({
      id: t.id,
      transitionType: t.transitionType,
      effectiveDate: t.effectiveDate,
      fromBranchId: t.fromBranchId,
      toBranchId: t.toBranchId,
      fromDepartmentId: t.fromDepartmentId,
      toDepartmentId: t.toDepartmentId,
      fromDesignationId: t.fromDesignationId,
      toDesignationId: t.toDesignationId,
      previousSalary: t.previousSalary,
      newSalary: t.newSalary,
      remarks: t.remarks,
      approvedByUserId: t.approvedByUserId,
      createdAt: t.createdAt,
    })),
  };

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
      <div className="container mx-auto max-w-6xl space-y-6 py-6">
        <EmployeeDetail
          employee={employeeData}
          branches={branches}
          departments={departments}
          designations={designations}
        />
      </div>
    </AppShell>
  );
}
