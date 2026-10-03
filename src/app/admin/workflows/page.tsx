import { AppShell } from "@/components/layout/app-shell";
import { requireAuth, requirePermission } from "@/lib/auth-helpers";
import { cookies } from "next/headers";
import { WorkflowManager } from "@/components/approvals/workflow-manager";

export const metadata = {
  title: "Approval Workflows | ERP",
};

export default async function AdminWorkflowsPage() {
  await requireAuth();
  await requirePermission("ADMIN_WORKFLOWS");

  const cookieStore = await cookies();
  const activeBranchId = cookieStore.get("branchId")?.value;

  if (!activeBranchId) {
    return null;
  }

  return (
    <AppShell currentBranchId={activeBranchId}>
      <WorkflowManager />
    </AppShell>
  );
}
