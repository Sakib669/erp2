import { AppShell } from "@/components/layout/app-shell";
import {
  requireAuth,
  requirePermission,
  getActiveBranchId,
} from "@/lib/auth-helpers";
import { WorkflowManager } from "@/components/approvals/workflow-manager";

export const metadata = {
  title: "Approval Workflows | ERP",
};

export default async function AdminWorkflowsPage() {
  await requireAuth();
  await requirePermission("ADMIN_WORKFLOWS");

  const activeBranchId = await getActiveBranchId();

  return (
    <AppShell currentBranchId={activeBranchId}>
      <WorkflowManager />
    </AppShell>
  );
}
