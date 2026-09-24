import Link from "next/link";
import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BranchManager,
  type BranchRecord,
} from "@/components/org/branch-manager";
import { Building2, Layers, ArrowRight } from "lucide-react";

export default async function OrgPage() {
  const user = await getCurrentUser();
  const cookieStore = await cookies();
  const activeBranchId = cookieStore.get("active_branch_id")?.value;

  // Retrieve primary company or ensure default
  let company = await prisma.company.findFirst({
    where: { deletedAt: null },
  });

  if (!company) {
    company = await prisma.company.create({
      data: {
        name: "Acme Global Enterprise",
        code: "ACME-CORP",
        currency: "USD",
        timezone: "UTC",
      },
    });
  }

  // Retrieve all active branches
  const branches = await prisma.branch.findMany({
    where: { companyId: company.id, deletedAt: null },
    orderBy: [{ isHeadquarters: "desc" }, { name: "asc" }],
  });

  // If no branch exists, seed a default HQ branch
  if (branches.length === 0) {
    const defaultHq = await prisma.branch.create({
      data: {
        companyId: company.id,
        name: "Corporate Headquarters",
        code: "CORP-HQ",
        isHeadquarters: true,
        timezone: "UTC",
      },
    });
    branches.push(defaultHq);
  }

  const currentBranch =
    branches.find((b) => b.id === activeBranchId) || branches[0];

  return (
    <AppShell
      user={user}
      branches={branches}
      currentBranchId={currentBranch.id}
      title="Organization & Facilities"
    >
      <div className="space-y-6">
        {/* Company Header Card */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
                  <Building2 className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-foreground text-base font-bold">
                      {company.name}
                    </CardTitle>
                    <Badge variant="outline" className="font-mono text-xs">
                      {company.code}
                    </Badge>
                  </div>
                  <CardDescription className="mt-0.5 text-xs">
                    Multi-tenant organization root · Base currency:{" "}
                    {company.currency} · Default timezone: {company.timezone}
                  </CardDescription>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                asChild
                className="gap-2 text-xs"
              >
                <Link href="/org/departments">
                  <Layers className="size-3.5" /> Manage Departments{" "}
                  <ArrowRight className="size-3" />
                </Link>
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Branch Management Section */}
        <BranchManager
          companyId={company.id}
          branches={branches as BranchRecord[]}
        />
      </div>
    </AppShell>
  );
}
