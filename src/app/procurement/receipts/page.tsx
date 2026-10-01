import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser, requirePermission } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { GoodsReceiptsManager } from "@/components/procurement/goods-receipts-manager";
import { PurchaseOrderStatus } from "@prisma/client";

export default async function GoodsReceiptsPage() {
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

  const isSuperAdmin = currentUser?.roles.includes("SUPER_ADMIN") || false;

  // Warehouses and Approved POs
  const [warehouses, rawApprovedOrders, rawReceipts] = await Promise.all([
    prisma.warehouse.findMany({
      where: {
        companyId,
        deletedAt: null,
        ...(activeBranchId && !isSuperAdmin
          ? { branchId: activeBranchId }
          : {}),
      },
      select: { id: true, name: true, code: true, branchId: true },
      orderBy: { name: "asc" },
    }),
    prisma.purchaseOrder.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: {
          in: [
            PurchaseOrderStatus.APPROVED,
            PurchaseOrderStatus.PARTIALLY_RECEIVED,
          ],
        },
        ...(activeBranchId && !isSuperAdmin
          ? { branchId: activeBranchId }
          : {}),
      },
      include: {
        supplier: { select: { id: true, name: true } },
        items: {
          include: {
            item: { select: { id: true, name: true, code: true, uom: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.goodsReceiptNote.findMany({
      where: {
        companyId,
        ...(activeBranchId && !isSuperAdmin
          ? { branchId: activeBranchId }
          : {}),
      },
      include: {
        purchaseOrder: {
          select: {
            id: true,
            poNumber: true,
            supplier: { select: { id: true, name: true } },
          },
        },
        warehouse: { select: { id: true, name: true, code: true } },
        receivedByUser: { select: { id: true, name: true } },
        items: {
          include: {
            item: { select: { id: true, name: true, code: true, uom: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

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
        <GoodsReceiptsManager
          companyId={companyId}
          warehouses={warehouses}
          approvedOrders={rawApprovedOrders}
          initialReceipts={rawReceipts}
          activeBranchId={activeBranchId}
        />
      </div>
    </AppShell>
  );
}
