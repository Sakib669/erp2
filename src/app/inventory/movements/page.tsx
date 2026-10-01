import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser, requirePermission } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import {
  StockMovementsLedger,
  type StockMovementItem,
  type WarehouseOption,
  type ItemOption,
} from "@/components/inventory/stock-movements-ledger";

export default async function StockMovementsPage() {
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

  // Fetch warehouses
  const rawWarehouses = await prisma.warehouse.findMany({
    where: { companyId, deletedAt: null },
    select: { id: true, name: true, code: true, branchId: true },
    orderBy: { name: "asc" },
  });

  const warehouses: WarehouseOption[] = rawWarehouses.map((w) => ({
    id: w.id,
    name: w.name,
    code: w.code,
    branchId: w.branchId,
  }));

  // Fetch items
  const rawItems = await prisma.item.findMany({
    where: { companyId, deletedAt: null },
    select: { id: true, name: true, code: true, uom: true, costPrice: true },
    orderBy: { name: "asc" },
  });

  const items: ItemOption[] = rawItems.map((i) => ({
    id: i.id,
    name: i.name,
    code: i.code,
    uom: i.uom,
    costPrice: i.costPrice,
  }));

  // Fetch movements
  const whereClause: Record<string, unknown> = { companyId };
  if (activeBranchId && !currentUser?.roles.includes("SUPER_ADMIN")) {
    whereClause.branchId = activeBranchId;
  }

  const rawMovements = await prisma.stockMovement.findMany({
    where: whereClause,
    include: {
      warehouse: { select: { id: true, name: true, code: true } },
      item: { select: { id: true, name: true, code: true, uom: true } },
      createdByUser: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const movements: StockMovementItem[] = rawMovements.map((m) => ({
    id: m.id,
    type: m.type,
    quantity: m.quantity,
    unitCost: m.unitCost,
    reference: m.reference,
    notes: m.notes,
    batchNumber: m.batchNumber,
    createdAt: m.createdAt.toISOString(),
    warehouse: m.warehouse,
    item: m.item,
    createdByUser: m.createdByUser,
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
        <StockMovementsLedger
          movements={movements}
          warehouses={warehouses}
          items={items}
          isInventoryAdmin={isInventoryAdmin}
        />
      </div>
    </AppShell>
  );
}
