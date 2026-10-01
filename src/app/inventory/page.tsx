import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser, requirePermission } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import {
  ItemsCatalog,
  type ItemCatalogItem,
  type CategoryOption,
  type WarehouseOption,
} from "@/components/inventory/items-catalog";

export default async function InventoryPage() {
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

  // Fetch categories
  const rawCategories = await prisma.itemCategory.findMany({
    where: { companyId, deletedAt: null },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });

  const categories: CategoryOption[] = rawCategories.map((c) => ({
    id: c.id,
    name: c.name,
    code: c.code,
  }));

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

  // Fetch items with stock levels
  const rawItems = await prisma.item.findMany({
    where: { companyId, deletedAt: null },
    include: {
      category: { select: { id: true, name: true, code: true } },
      stockLevels: {
        include: {
          warehouse: {
            select: { id: true, name: true, code: true, branchId: true },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const items: ItemCatalogItem[] = rawItems.map((item) => ({
    id: item.id,
    companyId: item.companyId,
    categoryId: item.categoryId,
    code: item.code,
    name: item.name,
    description: item.description,
    uom: item.uom,
    costPrice: item.costPrice,
    sellingPrice: item.sellingPrice,
    minStockLevel: item.minStockLevel,
    category: item.category,
    stockLevels: item.stockLevels.map((sl) => ({
      id: sl.id,
      warehouseId: sl.warehouseId,
      quantityOnHand: sl.quantityOnHand,
      warehouse: sl.warehouse,
    })),
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
        <ItemsCatalog
          companyId={companyId}
          items={items}
          categories={categories}
          warehouses={warehouses}
          isInventoryAdmin={isInventoryAdmin}
        />
      </div>
    </AppShell>
  );
}
