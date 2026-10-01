import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser, requirePermission } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { SupplierInvoicesManager } from "@/components/procurement/supplier-invoices-manager";

export default async function SupplierInvoicesPage() {
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
  let targetBranchId = rawBranches[0]?.id || "";
  if (activeBranchId) {
    const activeBranch = rawBranches.find((b) => b.id === activeBranchId);
    if (activeBranch) {
      companyId = activeBranch.companyId;
      targetBranchId = activeBranch.id;
    }
  }

  if (!companyId) {
    const firstCompany = await prisma.company.findFirst({
      where: { deletedAt: null },
    });
    companyId = firstCompany?.id || "";
  }

  const isSuperAdmin = currentUser?.roles.includes("SUPER_ADMIN") || false;

  const [suppliers, orders, invoices] = await Promise.all([
    prisma.supplier.findMany({
      where: { companyId, deletedAt: null, isActive: true },
      select: { id: true, code: true, name: true, paymentTermsDays: true },
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
      select: {
        id: true,
        poNumber: true,
        supplierId: true,
        totalAmount: true,
        items: {
          select: {
            id: true,
            quantityOrdered: true,
            quantityReceived: true,
            unitPrice: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.supplierInvoice.findMany({
      where: {
        companyId,
        deletedAt: null,
        ...(activeBranchId && !isSuperAdmin
          ? { branchId: activeBranchId }
          : {}),
      },
      include: {
        supplier: { select: { id: true, name: true, code: true } },
        purchaseOrder: {
          select: { id: true, poNumber: true, totalAmount: true },
        },
        goodsReceiptNote: { select: { id: true, grnNumber: true } },
        createdByUser: { select: { id: true, name: true } },
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
        <SupplierInvoicesManager
          companyId={companyId}
          branchId={targetBranchId}
          suppliers={suppliers}
          orders={orders}
          initialInvoices={invoices}
        />
      </div>
    </AppShell>
  );
}
