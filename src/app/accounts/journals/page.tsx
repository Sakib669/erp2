import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser, requirePermission } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import {
  JournalLedger,
  type JournalEntryItem,
  type BranchOption,
  type AccountOption,
} from "@/components/accounts/journal-ledger";

export default async function JournalLedgerPage() {
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

  const branches: BranchOption[] = rawBranches.map((b) => ({
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

  // Fetch accounts for voucher lines
  const rawAccounts = await prisma.account.findMany({
    where: { companyId, deletedAt: null },
    select: { id: true, code: true, name: true, type: true },
    orderBy: [{ code: "asc" }],
  });

  const accounts: AccountOption[] = rawAccounts.map((a) => ({
    id: a.id,
    code: a.code,
    name: a.name,
    type: a.type,
  }));

  // Fetch journal entries
  const whereClause: Record<string, unknown> = { deletedAt: null };
  if (activeBranchId && !currentUser?.roles.includes("SUPER_ADMIN")) {
    whereClause.branchId = activeBranchId;
  }

  const rawEntries = await prisma.journalEntry.findMany({
    where: whereClause,
    include: {
      branch: { select: { id: true, name: true, code: true } },
      _count: { select: { lines: true } },
    },
    orderBy: { entryDate: "desc" },
  });

  const entries: JournalEntryItem[] = rawEntries.map((e) => ({
    id: e.id,
    companyId: e.companyId,
    branchId: e.branchId,
    entryNumber: e.entryNumber,
    entryDate: e.entryDate.toISOString(),
    status: e.status,
    description: e.description,
    reference: e.reference,
    totalAmount: e.totalAmount,
    postedAt: e.postedAt ? e.postedAt.toISOString() : null,
    branch: {
      id: e.branch.id,
      name: e.branch.name,
      code: e.branch.code,
    },
    _count: e._count,
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
        <JournalLedger
          entries={entries}
          branches={branches}
          accounts={accounts}
          currentBranchId={activeBranchId}
          isAccountsAdmin={isAccountsAdmin}
        />
      </div>
    </AppShell>
  );
}
