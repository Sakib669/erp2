import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser, requirePermission } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import {
  WarehouseManager,
  type WarehouseItem,
  type BranchOption,
} from "@/components/inventory/warehouse-manager";

export default async function WarehousesPage() {
  const currentUser = await getCurrentUser();
  await requirePermission("INVENTORY_VIEW");

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

  // Fetch warehouses
  const whereClause: Record<string, unknown> = { companyId, deletedAt: null };
  if (activeBranchId && !currentUser?.roles.includes("SUPER_ADMIN")) {
    whereClause.branchId = activeBranchId;
  }

  const rawWarehouses = await prisma.warehouse.findMany({
    where: whereClause,
    include: {
      branch: { select: { id: true, name: true, code: true } },
      _count: { select: { stockLevels: true } },
    },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });

  const warehouses: WarehouseItem[] = rawWarehouses.map((wh) => ({
    id: wh.id,
    companyId: wh.companyId,
    branchId: wh.branchId,
    code: wh.code,
    name: wh.name,
    address: wh.address,
    isDefault: wh.isDefault,
    branch: wh.branch,
    _count: wh._count,
  }));

  const isInventoryAdmin =
    Boolean(
      currentUser?.roles.some((role) =>
        ["SUPER_ADMIN", "ADMIN", "BRANCH_MANAGER"].includes(role)
      ) || currentUser?.permissions.includes("INVENTORY_MANAGE")
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
        <WarehouseManager
          companyId={companyId}
          warehouses={warehouses}
          branches={branches}
          isInventoryAdmin={isInventoryAdmin}
        />
      </div>
    </AppShell>
  );
}
