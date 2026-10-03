import { AppShell } from "@/components/layout/app-shell";
import { requireAuth, getActiveBranchId } from "@/lib/auth-helpers";
import { ApprovalsDashboard } from "@/components/approvals/approvals-dashboard";

export const metadata = {
  title: "Approvals | ERP",
};

export default async function ApprovalsPage() {
  await requireAuth();
  const activeBranchId = await getActiveBranchId();

  return (
    <AppShell currentBranchId={activeBranchId}>
      <ApprovalsDashboard />
    </AppShell>
  );
}
