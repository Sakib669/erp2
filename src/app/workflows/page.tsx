import { AppShell } from "@/components/layout/app-shell";
import { requireAuth, getActiveBranchId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { WorkflowManager } from "@/components/approvals/workflow-manager";
import { ApprovalsDashboard } from "@/components/approvals/approvals-dashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Workflow, CheckSquare } from "lucide-react";

export const metadata = {
  title: "Workflows & Approvals | ERP",
  description: "Enterprise approval workflows and authorization management",
};

export default async function WorkflowsPage() {
  const user = await requireAuth();
  const activeBranchId = await getActiveBranchId();

  const dbBranches = await prisma.branch.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, code: true, isHeadquarters: true },
    orderBy: { createdAt: "asc" },
  });

  const branches =
    dbBranches.length > 0
      ? dbBranches
      : [
          {
            id: activeBranchId,
            name: "Headquarters",
            code: "HQ-01",
            isHeadquarters: true,
          },
        ];

  return (
    <AppShell
      user={user}
      branches={branches}
      currentBranchId={activeBranchId}
      title="Workflows & Approvals"
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Workflows & Approvals
          </h1>
          <p className="text-muted-foreground text-sm">
            Configure multi-tier approval hierarchies and process authorization
            requests.
          </p>
        </div>

        <Tabs defaultValue="approvals" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="approvals" className="flex items-center gap-2">
              <CheckSquare className="size-4" />
              Approvals Queue
            </TabsTrigger>
            <TabsTrigger value="workflows" className="flex items-center gap-2">
              <Workflow className="size-4" />
              Workflow Definitions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="approvals" className="mt-4">
            <ApprovalsDashboard />
          </TabsContent>

          <TabsContent value="workflows" className="mt-4">
            <WorkflowManager />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
