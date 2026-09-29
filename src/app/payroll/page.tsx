import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser, requirePermission } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import {
  PayrollDashboard,
  type PayrollRunItem,
  type BranchOption,
} from "@/components/payroll/payroll-dashboard";

export default async function PayrollPage() {
  const currentUser = await getCurrentUser();
  await requirePermission("PAYROLL_VIEW");

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

  // Fetch payroll runs
  const whereClause: Record<string, unknown> = { deletedAt: null };
  if (activeBranchId && !currentUser?.roles.includes("SUPER_ADMIN")) {
    whereClause.branchId = activeBranchId;
  }

  const rawRuns = await prisma.payrollRun.findMany({
    where: whereClause,
    include: {
      branch: { select: { id: true, name: true, code: true } },
      _count: { select: { payslips: true } },
    },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  const runs: PayrollRunItem[] = rawRuns.map((r) => ({
    id: r.id,
    companyId: r.companyId,
    branchId: r.branchId,
    year: r.year,
    month: r.month,
    status: r.status,
    totalGross: r.totalGross,
    totalDeductions: r.totalDeductions,
    totalNet: r.totalNet,
    employeeCount: r.employeeCount,
    idempotencyKey: r.idempotencyKey,
    notes: r.notes,
    processedAt: r.processedAt ? r.processedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
    branch: {
      id: r.branch.id,
      name: r.branch.name,
      code: r.branch.code,
    },
    _count: r._count,
  }));

  const isPayrollAdmin =
    Boolean(
      currentUser?.roles.some((role) =>
        ["SUPER_ADMIN", "ADMIN", "HR_ADMIN"].includes(role)
      ) || currentUser?.permissions.includes("PAYROLL_MANAGE")
    ) || false;

  return (
    <AppShell
      branches={branches}
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
        <PayrollDashboard
          runs={runs}
          branches={branches}
          currentBranchId={activeBranchId}
          isPayrollAdmin={isPayrollAdmin}
        />
      </div>
    </AppShell>
  );
}
