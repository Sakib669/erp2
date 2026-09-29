import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser, requirePermission } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import {
  PayrollRunDetails,
  type PayrollRunDetailsData,
} from "@/components/payroll/payroll-run-details";

interface PayrollRunPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function PayrollRunPage({ params }: PayrollRunPageProps) {
  const { id } = await params;
  const currentUser = await getCurrentUser();
  await requirePermission("PAYROLL_VIEW");

  const cookieStore = await cookies();
  const activeBranchId = cookieStore.get("active_branch_id")?.value;

  // Fetch branches for AppShell
  const rawBranches = await prisma.branch.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });

  const run = await prisma.payrollRun.findUnique({
    where: { id, deletedAt: null },
    include: {
      branch: { select: { id: true, name: true, code: true } },
      payslips: {
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeNumber: true,
              email: true,
              department: { select: { id: true, name: true } },
              designation: { select: { id: true, title: true } },
            },
          },
          items: true,
        },
        orderBy: { employee: { firstName: "asc" } },
      },
    },
  });

  if (!run) {
    notFound();
  }

  const runData: PayrollRunDetailsData = {
    id: run.id,
    companyId: run.companyId,
    branchId: run.branchId,
    year: run.year,
    month: run.month,
    status: run.status,
    totalGross: run.totalGross,
    totalDeductions: run.totalDeductions,
    totalNet: run.totalNet,
    employeeCount: run.employeeCount,
    notes: run.notes,
    processedAt: run.processedAt ? run.processedAt.toISOString() : null,
    branch: {
      id: run.branch.id,
      name: run.branch.name,
      code: run.branch.code,
    },
    payslips: run.payslips.map((p) => ({
      id: p.id,
      payrollRunId: p.payrollRunId,
      employeeId: p.employeeId,
      branchId: p.branchId,
      year: p.year,
      month: p.month,
      baseSalary: p.baseSalary,
      grossEarnings: p.grossEarnings,
      totalDeductions: p.totalDeductions,
      netSalary: p.netSalary,
      workingDays: p.workingDays,
      paidDays: p.paidDays,
      unpaidLeaveDays: p.unpaidLeaveDays,
      prorationRatio: p.prorationRatio,
      status: p.status,
      paymentDate: p.paymentDate ? p.paymentDate.toISOString() : null,
      paymentMethod: p.paymentMethod,
      employee: {
        id: p.employee.id,
        firstName: p.employee.firstName,
        lastName: p.employee.lastName,
        employeeNumber: p.employee.employeeNumber,
        email: p.employee.email,
        department: {
          id: p.employee.department.id,
          name: p.employee.department.name,
        },
        designation: {
          id: p.employee.designation.id,
          title: p.employee.designation.title,
        },
      },
      items: p.items.map((i) => ({
        id: i.id,
        name: i.name,
        code: i.code,
        type: i.type,
        amount: i.amount,
      })),
    })),
  };

  const isPayrollAdmin =
    Boolean(
      currentUser?.roles.some((role) =>
        ["SUPER_ADMIN", "ADMIN", "HR_ADMIN"].includes(role)
      ) || currentUser?.permissions.includes("PAYROLL_MANAGE")
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
        <PayrollRunDetails run={runData} isPayrollAdmin={isPayrollAdmin} />
      </div>
    </AppShell>
  );
}
