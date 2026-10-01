import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser, requirePermission } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import {
  FiscalPeriods,
  type FiscalPeriodItem,
} from "@/components/accounts/fiscal-periods";

export default async function FiscalPeriodsPage() {
  const currentUser = await getCurrentUser();
  await requirePermission("ACCOUNTS_VIEW");

  const cookieStore = await cookies();
  const activeBranchId = cookieStore.get("active_branch_id")?.value;

  // Retrieve branches for layout
  const rawBranches = await prisma.branch.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, code: true, companyId: true },
    orderBy: { name: "asc" },
  });

  const branches = rawBranches.map((b) => ({
    id: b.id,
    name: b.name,
    code: b.code,
  }));

  // Resolve target company
  let companyId = rawBranches[0]?.companyId;
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

  // Fetch fiscal periods
  const rawPeriods = await prisma.fiscalPeriod.findMany({
    where: { companyId, deletedAt: null },
    orderBy: { startDate: "desc" },
  });

  const periods: FiscalPeriodItem[] = rawPeriods.map((p) => ({
    id: p.id,
    companyId: p.companyId,
    name: p.name,
    startDate: p.startDate.toISOString(),
    endDate: p.endDate.toISOString(),
    isClosed: p.isClosed,
    closedAt: p.closedAt ? p.closedAt.toISOString() : null,
  }));

  const isAccountsAdmin =
    Boolean(
      currentUser?.roles.some((role) =>
        ["SUPER_ADMIN", "ADMIN", "FINANCE_MANAGER"].includes(role)
      ) || currentUser?.permissions.includes("ACCOUNTS_MANAGE")
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
        <FiscalPeriods
          companyId={companyId}
          periods={periods}
          isAccountsAdmin={isAccountsAdmin}
        />
      </div>
    </AppShell>
  );
}
