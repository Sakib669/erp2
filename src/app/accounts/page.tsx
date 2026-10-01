import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser, requirePermission } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import {
  ChartOfAccounts,
  type AccountItem,
} from "@/components/accounts/chart-of-accounts";

export default async function AccountsPage() {
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

  // Fetch accounts
  const rawAccounts = await prisma.account.findMany({
    where: { companyId, deletedAt: null },
    include: {
      parent: { select: { id: true, name: true, code: true } },
      _count: { select: { journalLines: true } },
    },
    orderBy: [{ code: "asc" }],
  });

  const accounts: AccountItem[] = rawAccounts.map((a) => ({
    id: a.id,
    companyId: a.companyId,
    code: a.code,
    name: a.name,
    type: a.type,
    currency: a.currency,
    balance: a.balance,
    description: a.description,
    parentId: a.parentId,
    parent: a.parent,
    _count: a._count,
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
        <ChartOfAccounts
          companyId={companyId}
          accounts={accounts}
          isAccountsAdmin={isAccountsAdmin}
        />
      </div>
    </AppShell>
  );
}
