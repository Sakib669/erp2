import Link from "next/link";
import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser, requirePermission } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import {
  Truck,
  FileText,
  PackageCheck,
  Receipt,
  ArrowRight,
  CheckCircle2,
  Clock,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PurchaseOrderStatus, SupplierInvoiceStatus } from "@prisma/client";

export default async function ProcurementOverviewPage() {
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

  // Fetch metrics and recent items
  const [
    supplierCount,
    openOrdersCount,
    recentReceiptsCount,
    invoices,
    recentOrders,
  ] = await Promise.all([
    prisma.supplier.count({
      where: { companyId, deletedAt: null, isActive: true },
    }),
    prisma.purchaseOrder.count({
      where: {
        companyId,
        deletedAt: null,
        status: {
          in: [
            PurchaseOrderStatus.SUBMITTED,
            PurchaseOrderStatus.APPROVED,
            PurchaseOrderStatus.PARTIALLY_RECEIVED,
          ],
        },
        ...(activeBranchId && !isSuperAdmin
          ? { branchId: activeBranchId }
          : {}),
      },
    }),
    prisma.goodsReceiptNote.count({
      where: {
        companyId,
        ...(activeBranchId && !isSuperAdmin
          ? { branchId: activeBranchId }
          : {}),
      },
    }),
    prisma.supplierInvoice.findMany({
      where: {
        companyId,
        deletedAt: null,
        ...(activeBranchId && !isSuperAdmin
          ? { branchId: activeBranchId }
          : {}),
      },
      select: { totalAmount: true, status: true },
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
        branch: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const totalInvoicedCents = invoices.reduce(
    (sum, inv) => sum + inv.totalAmount,
    0
  );
  const matchedCount = invoices.filter(
    (inv) => inv.status === SupplierInvoiceStatus.MATCHED
  ).length;
  const matchRate =
    invoices.length > 0
      ? Math.round((matchedCount / invoices.length) * 100)
      : 100;

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
      <div className="container mx-auto max-w-7xl space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Procurement & Supplier Operations
          </h1>
          <p className="text-muted-foreground text-sm">
            End to end supplier lifecycle, purchase requisitions, loading dock
            receipts, and accounts payable 3-way matching.
          </p>
        </div>

        {/* Quick KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Active Suppliers
              </CardTitle>
              <Truck className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{supplierCount}</div>
              <p className="text-muted-foreground mt-1 text-xs">
                Verified commercial partners
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Active Purchase Orders
              </CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {openOrdersCount}
              </div>
              <p className="text-muted-foreground mt-1 text-xs">
                Pending approval & fulfillment
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Goods Receipts
              </CardTitle>
              <PackageCheck className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                {recentReceiptsCount}
              </div>
              <p className="text-muted-foreground mt-1 text-xs">
                Dock deliveries verified
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                3-Way Match Rate
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {matchRate}%
              </div>
              <p className="text-muted-foreground mt-1 text-xs">
                {(totalInvoicedCents / 100).toLocaleString("en-US", {
                  style: "currency",
                  currency: "USD",
                })}{" "}
                total volume
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Feature Navigation Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/procurement/suppliers" className="group">
            <Card className="hover:border-primary/50 h-full transition-colors">
              <CardHeader>
                <div className="bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground mb-2 w-fit rounded-lg p-2 transition-colors">
                  <Truck className="h-6 w-6" />
                </div>
                <CardTitle className="flex items-center justify-between text-lg">
                  Suppliers
                  <ArrowRight className="text-muted-foreground h-4 w-4 transition-transform group-hover:translate-x-1" />
                </CardTitle>
                <CardDescription>
                  Maintain vendor directory, payment terms, and contact records.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/procurement/orders" className="group">
            <Card className="hover:border-primary/50 h-full transition-colors">
              <CardHeader>
                <div className="mb-2 w-fit rounded-lg bg-blue-500/10 p-2 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                  <FileText className="h-6 w-6" />
                </div>
                <CardTitle className="flex items-center justify-between text-lg">
                  Purchase Orders
                  <ArrowRight className="text-muted-foreground h-4 w-4 transition-transform group-hover:translate-x-1" />
                </CardTitle>
                <CardDescription>
                  Create, submit, and approve formal commercial orders with SKU
                  lines.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/procurement/receipts" className="group">
            <Card className="hover:border-primary/50 h-full transition-colors">
              <CardHeader>
                <div className="mb-2 w-fit rounded-lg bg-emerald-500/10 p-2 text-emerald-600 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                  <PackageCheck className="h-6 w-6" />
                </div>
                <CardTitle className="flex items-center justify-between text-lg">
                  Goods Receipts
                  <ArrowRight className="text-muted-foreground h-4 w-4 transition-transform group-hover:translate-x-1" />
                </CardTitle>
                <CardDescription>
                  Receive incoming dock shipments with automatic warehouse stock
                  ingestion.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/procurement/invoices" className="group">
            <Card className="hover:border-primary/50 h-full transition-colors">
              <CardHeader>
                <div className="mb-2 w-fit rounded-lg bg-purple-500/10 p-2 text-purple-600 transition-colors group-hover:bg-purple-600 group-hover:text-white">
                  <Receipt className="h-6 w-6" />
                </div>
                <CardTitle className="flex items-center justify-between text-lg">
                  Supplier Invoices
                  <ArrowRight className="text-muted-foreground h-4 w-4 transition-transform group-hover:translate-x-1" />
                </CardTitle>
                <CardDescription>
                  Run 3-way matching against purchase orders and received goods.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>

        {/* Recent Purchase Orders Summary */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Purchase Orders</CardTitle>
              <CardDescription>
                Latest commercial orders across your branch network.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/procurement/orders">View All Orders</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-sm">
                No purchase orders created yet.
              </p>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((po) => (
                  <div
                    key={po.id}
                    className="flex flex-col justify-between gap-2 rounded-lg border p-3 text-sm sm:flex-row sm:items-center"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-semibold">
                        {po.poNumber}
                      </span>
                      <span className="text-muted-foreground">•</span>
                      <span className="font-medium">{po.supplier.name}</span>
                      <span className="text-muted-foreground font-mono text-xs">
                        ({po.branch.name})
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-primary font-bold">
                        {(po.totalAmount / 100).toLocaleString("en-US", {
                          style: "currency",
                          currency: "USD",
                        })}
                      </span>
                      <Badge variant="outline">{po.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
