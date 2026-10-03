import Link from "next/link";
import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import {
  getCurrentUser,
  requirePermission,
  getActiveBranchId,
} from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Monitor, ArrowRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Fixed Asset Management | ERP",
};

export default async function AssetsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  await requirePermission("ASSET_VIEW");

  const activeBranchId = await getActiveBranchId();

  const branch = await prisma.branch.findUnique({
    where: { id: activeBranchId },
    select: { companyId: true },
  });
  if (!branch) return null;

  const [assetsCount, activeAssets] = await Promise.all([
    prisma.fixedAsset.count({
      where: {
        companyId: branch.companyId,
        branchId: activeBranchId,
        deletedAt: null,
      },
    }),
    prisma.fixedAsset.count({
      where: {
        companyId: branch.companyId,
        branchId: activeBranchId,
        deletedAt: null,
        status: "ACTIVE",
      },
    }),
  ]);

  return (
    <AppShell currentBranchId={activeBranchId}>
      <div className="mx-auto max-w-6xl space-y-8 p-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Fixed Asset Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Register and manage physical assets, run depreciation, and process
            disposals.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Monitor className="text-muted-foreground h-5 w-5" />
                <CardTitle>Asset Registry</CardTitle>
              </div>
              <CardDescription>
                View all fixed assets, their current book values, and
                depreciation history.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-2xl font-bold">{assetsCount}</p>
                  <p className="text-muted-foreground text-sm">Total Assets</p>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold">{activeAssets}</p>
                  <p className="text-muted-foreground text-sm">Active</p>
                </div>
              </div>
              <Button asChild className="w-full">
                <Link href="/assets/registry">
                  Go to Registry <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
