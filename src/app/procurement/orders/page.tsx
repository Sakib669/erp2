import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser, requirePermission } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { PurchaseOrdersManager } from "@/components/procurement/purchase-orders-manager";

export default async function PurchaseOrdersPage() {
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

  // Query suppliers, catalog items, and purchase orders
  const [suppliers, catalogItems, rawOrders] = await Promise.all([
    prisma.supplier.findMany({
      where: { companyId, deletedAt: null, isActive: true },
      select: { id: true, code: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.item.findMany({
      where: { companyId, deletedAt: null },
      select: { id: true, code: true, name: true, uom: true, costPrice: true },
      orderBy: { name: "asc" },
    }),
    prisma.purchaseOrder.findMany({
      where: {
        companyId,
        deletedAt: null,
        ...(activeBranchId && !isSuperAdmin
          ? { branchId: activeBranchId }
          : {}),
      },
      include: {
        supplier: { select: { id: true, name: true, code: true } },
        branch: { select: { id: true, name: true, code: true } },
        items: {
          include: {
            item: { select: { id: true, name: true, code: true, uom: true } },
          },
        },
        _count: { select: { goodsReceiptNotes: true, supplierInvoices: true } },
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
        <PurchaseOrdersManager
          companyId={companyId}
          branches={branches}
          suppliers={suppliers}
          catalogItems={catalogItems}
          initialOrders={rawOrders}
          activeBranchId={activeBranchId}
          isSuperAdmin={isSuperAdmin}
        />
      </div>
    </AppShell>
  );
}
