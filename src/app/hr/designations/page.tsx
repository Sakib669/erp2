import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser, requirePermission } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import {
  DesignationManager,
  type DesignationItem,
} from "@/components/hr/designation-manager";

export default async function DesignationsPage() {
  const currentUser = await getCurrentUser();
  await requirePermission("HR_VIEW");

  const cookieStore = await cookies();
  const activeBranchId = cookieStore.get("active_branch_id")?.value;

  const company = await prisma.company.findFirst({
    where: { deletedAt: null },
  });

  const companyId = company?.id || "";

  const rawBranches = await prisma.branch.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });

  const rawDesignations = await prisma.designation.findMany({
    where: {
      companyId,
      deletedAt: null,
    },
    include: {
      _count: {
        select: {
          employees: {
            where: { deletedAt: null },
          },
        },
      },
    },
    orderBy: { title: "asc" },
  });

  const designations: DesignationItem[] = rawDesignations.map((d) => ({
    id: d.id,
    companyId: d.companyId,
    title: d.title,
    code: d.code,
    description: d.description,
    _count: {
      employees: d._count.employees,
    },
  }));

  return (
    <AppShell
      branches={rawBranches}
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
      <div className="container mx-auto max-w-5xl space-y-6 py-6">
        <DesignationManager designations={designations} companyId={companyId} />
      </div>
    </AppShell>
  );
}
