import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser, requirePermission } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import {
  SalaryComponentManager,
  type SalaryComponentItem,
} from "@/components/payroll/salary-component-manager";

export default async function SalaryComponentsPage() {
  const currentUser = await getCurrentUser();
  await requirePermission("PAYROLL_VIEW");

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

  // Fetch salary components
  const rawComponents = await prisma.salaryComponent.findMany({
    where: {
      companyId,
      deletedAt: null,
    },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  const components: SalaryComponentItem[] = rawComponents.map((c) => ({
    id: c.id,
    companyId: c.companyId,
    name: c.name,
    code: c.code,
    type: c.type,
    calculationType: c.calculationType,
    defaultAmount: c.defaultAmount,
    isTaxable: c.isTaxable,
    createdAt: c.createdAt.toISOString(),
  }));

  const isPayrollAdmin =
    Boolean(
      currentUser?.roles.some((role) =>
        ["SUPER_ADMIN", "ADMIN", "HR_ADMIN"].includes(role)
      ) || currentUser?.permissions.includes("PAYROLL_MANAGE")
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
        <SalaryComponentManager
          companyId={companyId}
          components={components}
          isPayrollAdmin={isPayrollAdmin}
        />
      </div>
    </AppShell>
  );
}
