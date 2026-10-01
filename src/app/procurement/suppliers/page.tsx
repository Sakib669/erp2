import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser, requirePermission } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { SuppliersManager } from "@/components/procurement/suppliers-manager";

export default async function SuppliersPage() {
  const currentUser = await getCurrentUser();
  await requirePermission("PROCUREMENT_VIEW");

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

  const suppliers = await prisma.supplier.findMany({
    where: {
      companyId,
      deletedAt: null,
    },
    include: {
      _count: { select: { purchaseOrders: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <AppShell
      user={
        currentUser
          ? {
              name: currentUser.name,
              email: currentUser.email,
              roles: currentUser.roles,
            }
          : undefined
      }
      branches={branches}
      currentBranchId={activeBranchId}
    >
      <div className="container mx-auto max-w-7xl p-6">
        <SuppliersManager companyId={companyId} initialSuppliers={suppliers} />
      </div>
    </AppShell>
  );
}
